// 商家端确认收货接口：用户寄回商品后，商家确认收货，退款正式完成
// 退款状态变更为已退款，订单变更为已退款，恢复库存

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";
import { appendRefundEvent, restoreOrderStock } from "@/lib/refund";

export const dynamic = "force-dynamic";

export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  try {
    // 权限校验：仅商家可访问
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const refundId = Number(params.id);
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: { select: { merchantId: true } } },
    });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能处理本店订单的退款
    if (refund.order.merchantId !== merchant.id) {
      return NextResponse.json({ code: 1003, message: "无权处理该退款申请", data: null }, { status: 403 });
    }

    // 事务 + 乐观锁：条件更新，仅"寄回中"的退款可确认收货
    let ok = false;
    await prisma.$transaction(async (tx) => {
      const result = await tx.refund.updateMany({
        where: { id: refundId, status: "RETURNING" },
        data: { status: "REFUNDED", resolvedAt: new Date() },
      });
      if (result.count === 0) return;
      ok = true;
      await appendRefundEvent(tx, refundId, "REFUNDED", "商家确认收货，退款完成");
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: "REFUNDED" },
      });
      await restoreOrderStock(refund.orderId);
    });

    if (!ok) {
      return NextResponse.json({ code: 2002, message: "当前状态不可确认收货", data: null }, { status: 400 });
    }

    return NextResponse.json({ code: 0, message: "已确认收货，退款完成，库存已恢复", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
