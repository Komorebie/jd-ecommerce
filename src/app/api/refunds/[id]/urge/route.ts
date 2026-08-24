// 用户联系客服催促接口：商家迟迟不审核时，用户可催办，管理员端会看到催办标记
// 限频：每次催办间隔至少 24 小时，防刷

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendRefundEvent } from "@/lib/refund";

export const dynamic = "force-dynamic";

/** 催办最小间隔：24 小时 */
const URGUE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const refundId = Number(params.id);
    const refund = await prisma.refund.findUnique({ where: { id: refundId } });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能催办自己的退款申请
    if (refund.userId !== user.id) {
      return NextResponse.json({ code: 1003, message: "无权操作该退款申请", data: null }, { status: 403 });
    }
    // 仅待审核状态可催办（商家处理中/已终态的无需催办）
    if (refund.status !== "PENDING") {
      return NextResponse.json({ code: 2002, message: "当前状态无需催办", data: null }, { status: 400 });
    }
    // 限频：距上次催办不足 24 小时
    if (refund.urgedAt && Date.now() - new Date(refund.urgedAt).getTime() < URGUE_INTERVAL_MS) {
      return NextResponse.json(
        { code: 2004, message: "催办过于频繁，请 24 小时后再次催办", data: null },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { urgedAt: new Date(), urgedCount: { increment: 1 } },
      });
      await appendRefundEvent(tx, refundId, "PENDING", "用户联系客服催促，平台将尽快处理");
    });

    return NextResponse.json({ code: 0, message: "已通知平台，商家 48 小时未处理将自动退款", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
