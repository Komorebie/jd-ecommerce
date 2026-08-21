// 商家端发货接口：仅待发货状态的订单可发货，发货后状态变更为已发货

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

    const orderId = Number(params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json({ code: 1004, message: "订单不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能操作本店订单
    if (order.merchantId !== merchant.id) {
      return NextResponse.json({ code: 1003, message: "无权操作该订单", data: null }, { status: 403 });
    }
    // 状态校验：仅待发货订单可发货
    if (order.status !== "PENDING_SHIPMENT") {
      return NextResponse.json({ code: 2002, message: "当前订单状态不可发货", data: null }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });

    return NextResponse.json({ code: 0, message: "发货成功", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
