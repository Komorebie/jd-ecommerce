// 商家端同意退款接口：同意后订单变更为已退款，恢复库存

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";

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
      include: { order: { include: { items: true } } },
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

    // 事务：退款生效 + 订单变更为已退款 + 恢复库存
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: "REFUNDED" },
      });
      for (const item of refund.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    return NextResponse.json({ code: 0, message: "已同意退款，库存已恢复", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
