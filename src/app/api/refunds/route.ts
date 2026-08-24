import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoCloseExpiredRefunds, isRefundActive } from "@/lib/refund";

export const dynamic = "force-dynamic";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    // 懒执行超时处理：超过 7 天未寄回的退款自动关闭
    await autoCloseExpiredRefunds();

    const refunds = await prisma.refund.findMany({
      where: { userId },
      include: { order: { select: { orderNo: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ code: 0, message: "success", data: refunds });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const { orderId, reason, amount } = await request.json();
    if (!orderId || !reason || !amount) {
      return NextResponse.json({ code: 1001, message: "请填写完整信息", data: null }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { refunds: true },
    });

    if (!order || order.userId !== userId) {
      return NextResponse.json({ code: 1004, message: "订单不存在", data: null }, { status: 404 });
    }

    const allowed = ["PENDING_SHIPMENT", "SHIPPED"];
    if (!allowed.includes(order.status)) {
      return NextResponse.json({ code: 2002, message: "当前状态不可申请退款", data: null }, { status: 400 });
    }

    if (Number(amount) > Number(order.totalAmount)) {
      return NextResponse.json({ code: 2003, message: "退款金额不能超过实付金额", data: null }, { status: 400 });
    }

    const existing = order.refunds.find((r) => isRefundActive(r.status));
    if (existing) {
      return NextResponse.json({ code: 2002, message: "已有一个处理中的退款申请", data: null }, { status: 400 });
    }

    // PENDING_SHIPMENT: auto refund since not shipped yet
    const refundStatus = order.status === "PENDING_SHIPMENT" ? "APPROVED" : "PENDING";
    const now = new Date();
    const initialTimeline = [
      { status: refundStatus, note: refundStatus === "APPROVED" ? "未发货订单，退款自动通过" : "用户提交退款申请，等待商家审核", time: now.toISOString() },
    ];

    // 事务 + 乐观锁：条件更新订单状态，防止与并发操作（如商家发货）互相覆盖
    let refund;
    try {
      refund = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: orderId, status: order.status },
          data: { status: refundStatus === "APPROVED" ? "REFUNDED" : "REFUNDING" },
        });
        if (updated.count === 0) {
          throw new Error("ORDER_STATE_CHANGED");
        }

        const created = await tx.refund.create({
          data: {
            orderId,
            userId,
            reason,
            amount,
            status: refundStatus,
            timeline: initialTimeline,
          },
        });

        // Restore stock（未发货自动退款时恢复）
        if (refundStatus === "APPROVED") {
          const orderItems = await tx.orderItem.findMany({ where: { orderId } });
          for (let i = 0; i < orderItems.length; i++) {
            await tx.product.update({
              where: { id: orderItems[i].productId },
              data: { stock: { increment: orderItems[i].quantity } },
            });
          }
        }

        return created;
      });
    } catch (e) {
      if (e instanceof Error && e.message === "ORDER_STATE_CHANGED") {
        return NextResponse.json({ code: 2002, message: "订单状态已变化，请刷新后重试", data: null }, { status: 400 });
      }
      throw e;
    }

    return NextResponse.json({
      code: 0,
      message: refundStatus === "APPROVED" ? "退款已自动通过（未发货订单）" : "退款申请已提交，等待商家审核",
      data: refund,
    }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
