// 退款流程集成测试：直接调用真实 API 路由，连接真实 Neon 库，覆盖开发指南 7 个退款用例
import { beforeAll, afterAll, describe, it, expect, vi, beforeEach } from "vitest";

// 只覆盖 getServerSession，保留 next-auth 其余导出
vi.mock("next-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth")>();
  return { ...actual, getServerSession: vi.fn() };
});

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  buildTestData,
  cleanupTestData,
  buildTestOrder,
  getProductStock,
  getOrderStatus,
  getRefundStatus,
  type TestData,
  TEST_PREFIX,
} from "./helpers";

// 各路由处理器
import { POST as createRefund } from "@/app/api/refunds/route";
import { PUT as shipOrder } from "@/app/api/merchant/orders/[id]/ship/route";
import { PUT as approveRefund } from "@/app/api/merchant/refunds/[id]/approve/route";
import { PUT as rejectRefund } from "@/app/api/merchant/refunds/[id]/reject/route";
import { PUT as confirmReceipt } from "@/app/api/merchant/refunds/[id]/confirm-receipt/route";
import { PUT as returnGoods } from "@/app/api/refunds/[id]/return/route";
import { PUT as appealRefund } from "@/app/api/refunds/[id]/appeal/route";
import { PUT as forceResolve } from "@/app/api/admin/refunds/[id]/force-resolve/route";
import { autoApproveExpiredRefunds, autoCloseExpiredRefunds } from "@/lib/refund";

const mockedSession = vi.mocked(getServerSession);

let data: TestData;

/** 构造 JSON 请求 */
function jsonReq(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** 无 body 的请求（PUT/DELETE） */
function emptyReq(method = "PUT"): Request {
  return new Request("http://localhost/api/test", { method });
}

beforeAll(async () => {
  data = await buildTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

beforeEach(() => {
  mockedSession.mockReset();
});

describe("退款流程：正常流程", () => {
  it("下单→支付→发货→申请退款→商家同意→寄回→确认收货→退款成功", async () => {
    const { orderId } = await buildTestOrder(data, { status: "SHIPPED" });
    const stockBefore = await getProductStock(data.productId);

    // 用户申请退款
    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    let res = await createRefund(jsonReq({ orderId, reason: "不想要了", amount: 100 }));
    expect(res.status).toBe(201);
    expect(await getRefundStatus(orderId)).toBe("PENDING");

    // 商家同意 → APPROVED
    mockedSession.mockResolvedValue({ user: { email: data.merchantEmail } } as never);
    res = await approveRefund(emptyReq(), { params: { id: String((await prisma.refund.findFirst({ where: { orderId } }))!.id) } });
    expect(res.status).toBe(200);
    expect(await getRefundStatus(orderId)).toBe("APPROVED");

    // 用户寄回 → RETURNING
    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    const refundId = (await prisma.refund.findFirst({ where: { orderId } }))!.id;
    res = await returnGoods(emptyReq(), { params: { id: String(refundId) } });
    expect(res.status).toBe(200);
    expect(await getRefundStatus(orderId)).toBe("RETURNING");

    // 商家确认收货 → REFUNDED，订单 REFUNDED，库存回补
    mockedSession.mockResolvedValue({ user: { email: data.merchantEmail } } as never);
    res = await confirmReceipt(emptyReq(), { params: { id: String(refundId) } });
    expect(res.status).toBe(200);
    expect(await getRefundStatus(orderId)).toBe("REFUNDED");
    expect(await getOrderStatus(orderId)).toBe("REFUNDED");
    expect(await getProductStock(data.productId)).toBe(stockBefore + 1);
  });
});

describe("退款流程：异常流程 1 - 商家超时 48h 自动退款", () => {
  it("商家 48 小时未处理，系统自动同意", async () => {
    const { orderId } = await buildTestOrder(data, { status: "SHIPPED" });

    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    await createRefund(jsonReq({ orderId, reason: "商家不理我", amount: 100 }));
    expect(await getRefundStatus(orderId)).toBe("PENDING");

    // 把申请时间提前 48h+，触发自动同意
    const refund = await prisma.refund.findFirst({ where: { orderId } });
    await prisma.refund.update({
      where: { id: refund!.id },
      data: { appliedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    });

    const handled = await autoApproveExpiredRefunds();
    expect(handled).toBeGreaterThanOrEqual(1);
    expect(await getRefundStatus(orderId)).toBe("APPROVED");
  });
});

describe("退款流程：异常流程 2 - 商家拒绝→用户申诉→管理员裁决", () => {
  it("商家拒绝后用户申诉，管理员裁决通过退款", async () => {
    const { orderId } = await buildTestOrder(data, { status: "SHIPPED" });

    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    await createRefund(jsonReq({ orderId, reason: "质量有问题", amount: 100 }));

    // 商家拒绝 → REJECTED，订单回退 SHIPPED
    mockedSession.mockResolvedValue({ user: { email: data.merchantEmail } } as never);
    const refundId = (await prisma.refund.findFirst({ where: { orderId } }))!.id;
    let res = await rejectRefund(jsonReq({ rejectReason: "商品完好不退款" }, "PUT"), { params: { id: String(refundId) } });
    expect(res.status).toBe(200);
    expect(await getRefundStatus(orderId)).toBe("REJECTED");
    expect(await getOrderStatus(orderId)).toBe("SHIPPED");

    // 用户申诉 → APPEALING
    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    res = await appealRefund(jsonReq({ appealReason: "商家欺骗消费者" }, "PUT"), { params: { id: String(refundId) } });
    expect(res.status).toBe(200);
    expect(await getRefundStatus(orderId)).toBe("APPEALING");

    // 管理员裁决通过 → REFUNDED
    // 管理端需要 ADMIN 角色用户，临时给测试商家用户改成 ADMIN 模拟（管理员与商家为不同账号时则需额外建 admin）
    await prisma.user.update({ where: { id: data.merchantUserId }, data: { role: "ADMIN" } });
    mockedSession.mockResolvedValue({ user: { email: data.merchantEmail } } as never);
    res = await forceResolve(jsonReq({ action: "APPROVE", reason: "支持用户" }, "PUT"), { params: { id: String(refundId) } });
    expect(res.status).toBe(200);
    expect(await getRefundStatus(orderId)).toBe("REFUNDED");
    expect(await getOrderStatus(orderId)).toBe("REFUNDED");
    // 恢复为 MERCHANT，供其他用例使用
    await prisma.user.update({ where: { id: data.merchantUserId }, data: { role: "MERCHANT" } });
  });
});

describe("退款流程：异常流程 3 - 用户超时未寄回自动关闭", () => {
  it("商家同意后用户 7 天未寄回，退款自动关闭，订单回退", async () => {
    const { orderId } = await buildTestOrder(data, { status: "SHIPPED" });

    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    await createRefund(jsonReq({ orderId, reason: "超时未寄回测试", amount: 100 }));

    // 商家同意 → APPROVED
    mockedSession.mockResolvedValue({ user: { email: data.merchantEmail } } as never);
    const refundId = (await prisma.refund.findFirst({ where: { orderId } }))!.id;
    await approveRefund(emptyReq(), { params: { id: String(refundId) } });
    expect(await getRefundStatus(orderId)).toBe("APPROVED");

    // 把同意时间提前 7 天+，触发自动关闭
    await prisma.refund.update({
      where: { id: refundId },
      data: { resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });

    await autoCloseExpiredRefunds();
    expect(await getRefundStatus(orderId)).toBe("CLOSED");
    expect(await getOrderStatus(orderId)).toBe("SHIPPED");
  });
});

describe("退款流程：边界测试", () => {
  it("已完成订单不可申请退款（预期拒绝）", async () => {
    const { orderId } = await buildTestOrder(data, { status: "COMPLETED" });

    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    const res = await createRefund(jsonReq({ orderId, reason: "已完成想退款", amount: 100 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe(2002);
  });

  it("同一订单不可重复申请退款（预期拒绝）", async () => {
    const { orderId } = await buildTestOrder(data, { status: "SHIPPED" });

    mockedSession.mockResolvedValue({ user: { email: data.userEmail } } as never);
    let res = await createRefund(jsonReq({ orderId, reason: "第一次申请", amount: 100 }));
    expect(res.status).toBe(201);

    res = await createRefund(jsonReq({ orderId, reason: "重复申请", amount: 100 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe(2002);
  });
});

describe("退款流程：并发测试", () => {
  it("商家发货的同时用户申请退款，仅一个成功", async () => {
    const { orderId } = await buildTestOrder(data, { status: "PENDING_SHIPMENT" });

    const refund = (async () => {
      mockedSession.mockResolvedValueOnce({ user: { email: data.userEmail } } as never);
      const r = await createRefund(jsonReq({ orderId, reason: "并发退款", amount: 100 }));
      return r.status;
    })();

    const ship = (async () => {
      mockedSession.mockResolvedValueOnce({ user: { email: data.merchantEmail } } as never);
      const r = await shipOrder(emptyReq(), { params: { id: String(orderId) } });
      return r.status;
    })();

    const [refundStatus, shipStatus] = await Promise.all([refund, ship]);

    // 发货成功(200) 且退款被拒，或退款成功(201) 且发货被拒
    const successCount = [refundStatus, shipStatus].filter((s) => s === 200 || s === 201).length;
    expect(successCount).toBe(1);

    // 终态自洽：订单要么 SHIPPED 要么 REFUNDING/REFUNDED
    const finalStatus = await getOrderStatus(orderId);
    expect(["SHIPPED", "REFUNDING", "REFUNDED"]).toContain(finalStatus);
  });
});

// 确保测试数据残留可追溯（供调试）
export { TEST_PREFIX };
