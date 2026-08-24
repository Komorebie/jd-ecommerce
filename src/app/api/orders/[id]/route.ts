import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.id ?? null;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const order = await prisma.order.findFirst({
      where: { id: Number(params.id), deletedAt: null },
      include: {
        items: true,
        address: { select: { receiver: true, phone: true, province: true, city: true, district: true, detail: true } },
        merchant: { select: { shopName: true } },
        refunds: { orderBy: { id: "desc" } },
      },
    });

    if (!order || order.userId !== userId) {
      return NextResponse.json({ code: 1004, message: "订单不存在", data: null }, { status: 404 });
    }

    return NextResponse.json({ code: 0, message: "success", data: order });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(params.id) },
      include: { items: true },
    });
    if (!order || order.userId !== userId) {
      return NextResponse.json({ code: 1004, message: "订单不存在", data: null }, { status: 404 });
    }

    const { action } = await request.json();

    if (action === "pay") {
      if (order.status !== "PENDING_PAYMENT") {
        return NextResponse.json({ code: 2002, message: "当前状态不可支付", data: null }, { status: 400 });
      }
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PENDING_SHIPMENT", paidAt: new Date() },
      });
      return NextResponse.json({ code: 0, message: "支付成功", data: null });
    }

    if (action === "cancel") {
      if (order.status !== "PENDING_PAYMENT") {
        return NextResponse.json({ code: 2002, message: "当前订单状态不允许取消", data: null }, { status: 400 });
      }
      // Restore stock
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      return NextResponse.json({ code: 0, message: "订单已取消", data: null });
    }

    if (action === "confirm") {
      if (order.status !== "SHIPPED") {
        return NextResponse.json({ code: 2002, message: "当前状态不可确认收货", data: null }, { status: 400 });
      }
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      return NextResponse.json({ code: 0, message: "已确认收货", data: null });
    }

    return NextResponse.json({ code: 1001, message: "未知操作", data: null }, { status: 400 });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const order = await prisma.order.findFirst({
      where: { id: Number(params.id), userId, deletedAt: null },
    });
    if (!order) {
      return NextResponse.json({ code: 1004, message: "订单不存在", data: null }, { status: 404 });
    }
    // 软删除：仅已取消订单可删除记录
    if (order.status !== "CANCELLED") {
      return NextResponse.json({ code: 2002, message: "仅已取消的订单可删除记录", data: null }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ code: 0, message: "订单记录已删除", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
