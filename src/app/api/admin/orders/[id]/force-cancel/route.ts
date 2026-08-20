// 管理端强制取消订单接口：用于平台介入场景（纠纷、违规订单等）

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  try {
    // 权限校验：仅管理员可访问
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const orderId = Number(params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, refunds: true },
    });

    if (!order) {
      return NextResponse.json({ code: 1004, message: "订单不存在", data: null }, { status: 404 });
    }

    // 终态订单（已完成/已取消/已退款）不可再强制取消
    const terminal = ["COMPLETED", "CANCELLED", "REFUNDED"];
    if (terminal.includes(order.status)) {
      return NextResponse.json({ code: 2002, message: "订单已处于终态，无法取消", data: null }, { status: 400 });
    }

    // 事务：取消订单 + 恢复库存 + 关闭该订单所有未完成的退款申请
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      // 恢复库存（下单时已扣减）
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // 关闭处理中的退款申请
      await tx.refund.updateMany({
        where: { orderId, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "CLOSED", resolvedAt: new Date(), rejectReason: "订单已被平台强制取消" },
      });
    });

    return NextResponse.json({ code: 0, message: "订单已强制取消，库存已恢复", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
