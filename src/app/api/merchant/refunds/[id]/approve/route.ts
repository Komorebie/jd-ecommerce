// 商家端同意退款接口：同意后进入退货流程，等待用户寄回商品（7天内）
// 后续流程：用户寄回(RETURNING) → 商家确认收货(confirm-receipt) → 退款完成+恢复库存

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";
import { appendRefundEvent } from "@/lib/refund";

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
      include: { order: true },
    });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能处理本店订单的退款
    if (refund.order.merchantId !== merchant.id) {
      return NextResponse.json({ code: 1003, message: "无权处理该退款申请", data: null }, { status: 403 });
    }
    // 状态校验：仅待审核的退款可同意
    if (refund.status !== "PENDING") {
      return NextResponse.json({ code: 2002, message: "该退款申请已处理，不可重复操作", data: null }, { status: 400 });
    }

    // 商家同意：退款状态变更为"已同意"，等待用户寄回商品
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
      await appendRefundEvent(tx, refundId, "APPROVED", "商家同意退款，等待用户寄回商品（7 天内）");
    });

    return NextResponse.json({ code: 0, message: "已同意退款，等待用户寄回商品（7天内）", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
