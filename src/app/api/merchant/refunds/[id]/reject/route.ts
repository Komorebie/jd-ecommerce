// 商家端拒绝退款接口：需填写拒绝理由，订单恢复到退款前状态，用户可向平台申诉

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // 权限校验：仅商家可访问
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const refundId = Number(params.id);
    const body = (await request.json()) as { rejectReason?: string };
    const rejectReason = body.rejectReason?.trim();

    if (!rejectReason) {
      return NextResponse.json({ code: 1001, message: "请填写拒绝理由", data: null }, { status: 400 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: true },
    });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能处理本店订单的退款
    if (refund.order.merchantId !== merchant.id) {
      return NextResponse.json({ code: 1003, message: "无权处理该退款申请", data: null }, { status: 403 });
    }
    // 状态校验：仅待审核的退款可拒绝
    if (refund.status !== "PENDING") {
      return NextResponse.json({ code: 2002, message: "该退款申请已处理，不可重复操作", data: null }, { status: 400 });
    }

    // 计算退款前的订单状态：按订单各时间节点反推
    const revertStatus = refund.order.completedAt
      ? "COMPLETED"
      : refund.order.shippedAt
        ? "SHIPPED"
        : refund.order.paidAt
          ? "PENDING_SHIPMENT"
          : "PENDING_PAYMENT";

    // 事务：拒绝退款 + 记录理由 + 订单恢复原状态
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: "REJECTED", rejectReason, resolvedAt: new Date() },
      });
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: revertStatus },
      });
    });

    return NextResponse.json({ code: 0, message: "已拒绝退款，订单已恢复原状态", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
