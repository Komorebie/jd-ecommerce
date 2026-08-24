import { describe, it, expect } from "vitest";
import {
  computeRevertStatus,
  isRefundActive,
  REFUND_TIMEOUT_HOURS,
  REFUND_CANCEL_WINDOW_MS,
  RETURN_DEADLINE_MS,
} from "./refund";

describe("computeRevertStatus（订单状态回退计算）", () => {
  it("已完成订单回退为 COMPLETED", () => {
    expect(
      computeRevertStatus({ completedAt: new Date(), shippedAt: new Date(), paidAt: new Date() }),
    ).toBe("COMPLETED");
  });

  it("已发货未完成回退为 SHIPPED", () => {
    expect(
      computeRevertStatus({ completedAt: null, shippedAt: new Date(), paidAt: new Date() }),
    ).toBe("SHIPPED");
  });

  it("已支付未发货回退为 PENDING_SHIPMENT", () => {
    expect(
      computeRevertStatus({ completedAt: null, shippedAt: null, paidAt: new Date() }),
    ).toBe("PENDING_SHIPMENT");
  });

  it("未支付回退为 PENDING_PAYMENT", () => {
    expect(
      computeRevertStatus({ completedAt: null, shippedAt: null, paidAt: null }),
    ).toBe("PENDING_PAYMENT");
  });
});

describe("isRefundActive（退款流程中判定）", () => {
  it("PENDING/APPROVED/RETURNING/APPEALING 均视为处理中", () => {
    expect(isRefundActive("PENDING")).toBe(true);
    expect(isRefundActive("APPROVED")).toBe(true);
    expect(isRefundActive("RETURNING")).toBe(true);
    expect(isRefundActive("APPEALING")).toBe(true);
  });

  it("终态状态不视为处理中", () => {
    expect(isRefundActive("REJECTED")).toBe(false);
    expect(isRefundActive("REFUNDED")).toBe(false);
    expect(isRefundActive("CLOSED")).toBe(false);
  });
});

describe("退款超时常量", () => {
  it("商家超时自动同意为 48 小时", () => {
    expect(REFUND_TIMEOUT_HOURS).toBe(48);
  });

  it("用户撤销窗口为 48 小时", () => {
    expect(REFUND_CANCEL_WINDOW_MS).toBe(48 * 60 * 60 * 1000);
  });

  it("用户寄回期限为 7 天", () => {
    expect(RETURN_DEADLINE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
