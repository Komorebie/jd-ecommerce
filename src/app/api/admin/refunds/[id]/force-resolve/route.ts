// 管理端强制裁决退款接口：支持两种场景
// 1. 直接介入：对"待商家审核"(PENDING)的退款直接裁决
// 2. 申诉裁决：对"申诉中"(APPEALING)的退款做最终裁决，裁决后不可再申诉

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { restoreOrderStock } from "@/lib/refund";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // 权限校验：仅管理员可访问
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const refundId = Number(params.id);
    const body = (await request.json()) as { action?: "APPROVE" | "REJECT"; reason?: string };
    const reason = body.reason?.trim();

    if (!body.action || !["APPROVE", "REJECT"].includes(body.action)) {
      return NextResponse.json({ code: 1001, message: "请选择裁决类型", data: null }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ code: 1001, message: "请填写裁决理由", data: null }, { status: 400 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: true },
    });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }

    // 可裁决的状态：待审核（直接介入）或申诉中（申诉裁决）
    if (refund.status !== "PENDING" && refund.status !== "APPEALING") {
      return NextResponse.json({ code: 2002, message: "该退款申请已处理，不可重复裁决", data: null }, { status: 400 });
    }

    if (body.action === "APPROVE") {
      // 裁决通过：退款生效，订单变更为已退款，恢复库存
      await prisma.$transaction(async (tx) => {
        await tx.refund.update({
          where: { id: refundId },
          data: { status: "REFUNDED", resolvedAt: new Date() },
        });
        await tx.order.update({
          where: { id: refund.orderId },
          data: { status: "REFUNDED" },
        });
      });
      await restoreOrderStock(refund.orderId);
      return NextResponse.json({ code: 0, message: "已裁决：退款通过，库存已恢复", data: null });
    }

    // 裁决驳回：退款关闭（终态，不可再申诉），订单恢复到退款前状态
    const revertStatus = refund.order.completedAt
      ? "COMPLETED"
      : refund.order.shippedAt
        ? "SHIPPED"
        : refund.order.paidAt
          ? "PENDING_SHIPMENT"
          : "PENDING_PAYMENT";

    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: "CLOSED", rejectReason: `管理员裁决驳回：${reason}`, resolvedAt: new Date() },
      });
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: revertStatus },
      });
    });

    return NextResponse.json({ code: 0, message: "已裁决：退款驳回，流程已终结", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
