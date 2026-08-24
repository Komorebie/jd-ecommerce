// 用户寄回商品接口：商家同意退款后，用户确认已寄回商品（模拟）
// 状态从"已同意"变更为"寄回中"，等待商家确认收货

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RETURN_DEADLINE_MS, appendRefundEvent, computeRevertStatus } from "@/lib/refund";

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
    // 越权校验：只能操作自己的退款申请
    if (refund.userId !== user.id) {
      return NextResponse.json({ code: 1003, message: "无权操作该退款申请", data: null }, { status: 403 });
    }
    // 状态校验：仅"商家已同意"状态可寄回
    if (refund.status !== "APPROVED") {
      return NextResponse.json({ code: 2002, message: "当前状态不可寄回商品", data: null }, { status: 400 });
    }
    // 时限校验：商家同意后超过 7 天未寄回，自动关闭
    const agreedAt = refund.resolvedAt ? new Date(refund.resolvedAt).getTime() : Date.now();
    if (Date.now() - agreedAt > RETURN_DEADLINE_MS) {
      await prisma.$transaction(async (tx) => {
        await tx.refund.update({
          where: { id: refundId },
          data: { status: "CLOSED", rejectReason: "超过 7 天未寄回商品，退款申请已自动关闭" },
        });
        await appendRefundEvent(tx, refundId, "CLOSED", "超过 7 天未寄回商品，退款自动关闭");
        await tx.order.update({
          where: { id: refund.orderId },
          data: { status: computeRevertStatus(refund.order) },
        });
      });
      return NextResponse.json({ code: 2004, message: "已超过 7 天寄回期限，退款申请已自动关闭", data: null }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: "RETURNING" },
      });
      await appendRefundEvent(tx, refundId, "RETURNING", "用户已寄回商品，等待商家确认收货");
    });

    return NextResponse.json({ code: 0, message: "已确认寄回，等待商家确认收货", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
