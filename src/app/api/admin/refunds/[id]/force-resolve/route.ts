// 管理端强制裁决退款接口：管理员对退款纠纷做最终裁决，裁决后不可再申诉

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

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

    if (!body.action || !["APPROVE", "REJECT"].includes(body.action)) {
      return NextResponse.json({ code: 1001, message: "请选择裁决类型", data: null }, { status: 400 });
    }
    if (!body.reason?.trim()) {
      return NextResponse.json({ code: 1001, message: "请填写裁决理由", data: null }, { status: 400 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: { include: { items: true } } },
    });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }

    // 已终结的退款申请（已同意/已拒绝/已关闭）不可重复裁决
    if (refund.status !== "PENDING") {
      return NextResponse.json({ code: 2002, message: "该退款申请已处理，不可重复裁决", data: null }, { status: 400 });
    }

    if (body.action === "APPROVE") {
      // 裁决通过：退款生效，订单变更为已退款，恢复库存
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
      return NextResponse.json({ code: 0, message: "已裁决：退款通过，库存已恢复", data: null });
    }

    // 裁决拒绝：记录拒绝理由，订单恢复到退款前的状态
    const prevStatus = refund.order.status;
    const revertStatus =
      refund.order.completedAt ? "COMPLETED"
      : refund.order.shippedAt ? "SHIPPED"
      : refund.order.paidAt ? "PENDING_SHIPMENT"
      : "PENDING_PAYMENT";

    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: "REJECTED", rejectReason: body.reason, resolvedAt: new Date() },
      });
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: revertStatus },
      });
    });

    return NextResponse.json({ code: 0, message: "已裁决：退款驳回", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
