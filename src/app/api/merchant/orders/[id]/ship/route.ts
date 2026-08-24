// 商家端发货接口：仅待发货状态的订单可发货，发货后状态变更为已发货

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

    const orderId = Number(params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, merchantId: true },
    });

    if (!order) {
      return NextResponse.json({ code: 1004, message: "订单不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能操作本店订单
    if (order.merchantId !== merchant.id) {
      return NextResponse.json({ code: 1003, message: "无权操作该订单", data: null }, { status: 403 });
    }

    const { trackingNo } = (await request.json().catch(() => ({}))) as { trackingNo?: string };

    // 乐观锁：条件更新，仅待发货订单可发货，防止与并发请求（如退款）互相覆盖
    const result = await prisma.order.updateMany({
      where: { id: orderId, status: "PENDING_SHIPMENT" },
      data: { status: "SHIPPED", shippedAt: new Date(), trackingNo: trackingNo?.trim() || null },
    });
    if (result.count === 0) {
      return NextResponse.json({ code: 2002, message: "当前订单状态不可发货", data: null }, { status: 400 });
    }

    return NextResponse.json({ code: 0, message: "发货成功", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
