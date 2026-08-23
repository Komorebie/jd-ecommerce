// 用户申诉接口：退款被商家拒绝后，用户可向平台申诉，由管理员最终裁决

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    const body = (await request.json()) as { appealReason?: string };
    const appealReason = body.appealReason?.trim();

    if (!appealReason) {
      return NextResponse.json({ code: 1001, message: "请填写申诉理由", data: null }, { status: 400 });
    }

    const refund = await prisma.refund.findUnique({ where: { id: refundId } });

    if (!refund) {
      return NextResponse.json({ code: 1004, message: "退款申请不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能申诉自己的退款申请
    if (refund.userId !== user.id) {
      return NextResponse.json({ code: 1003, message: "无权操作该退款申请", data: null }, { status: 403 });
    }
    // 状态校验：仅"商家已拒绝"状态可申诉
    if (refund.status !== "REJECTED") {
      return NextResponse.json({ code: 2002, message: "当前状态不可申诉", data: null }, { status: 400 });
    }

    await prisma.refund.update({
      where: { id: refundId },
      data: { status: "APPEALING", appealReason },
    });

    return NextResponse.json({ code: 0, message: "申诉已提交，等待平台裁决", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
