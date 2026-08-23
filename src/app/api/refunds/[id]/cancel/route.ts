// 用户撤销退款申请接口：仅申请后 48 小时内、状态为待审核时可撤销
// 撤销后退款申请关闭，订单恢复到退款前状态

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REFUND_CANCEL_WINDOW_MS, computeRevertStatus } from "@/lib/refund";

export const dynamic = "force-dynamic";

export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  try {
    // 登录校验
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const refundId = Number(params.id);
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: true },
    });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能撤销自己的退款申请
    if (refund.userId !== user.id) {
      return NextResponse.json({ code: 1003, message: "无权操作该退款申请", data: null }, { status: 403 });
    }
    // 状态校验：仅待审核的申请可撤销
    if (refund.status !== "PENDING") {
      return NextResponse.json({ code: 2002, message: "当前状态不可撤销退款申请", data: null }, { status: 400 });
    }
    // 时限校验：超过 48 小时不可撤销
    const elapsed = Date.now() - new Date(refund.appliedAt).getTime();
    if (elapsed > REFUND_CANCEL_WINDOW_MS) {
      return NextResponse.json({ code: 2004, message: "已超过 48 小时，不可撤销退款申请", data: null }, { status: 400 });
    }

    // 事务：关闭退款申请 + 订单恢复原状态
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: "CLOSED", rejectReason: "用户主动撤销退款申请", resolvedAt: new Date() },
      });
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: computeRevertStatus(refund.order) },
      });
    });

    return NextResponse.json({ code: 0, message: "退款申请已撤销，订单已恢复", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
