// 商家端回复评价接口：仅本店商品的评价可回复

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const reviewId = Number(params.id);
    const { reply } = (await request.json()) as { reply?: string };
    if (!reply?.trim()) {
      return NextResponse.json({ code: 1001, message: "请输入回复内容", data: null }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { merchantId: true } } },
    });

    if (!review) {
      return NextResponse.json({ code: 1004, message: "评价不存在", data: null }, { status: 404 });
    }
    // 越权校验：只能回复本店商品的评价
    if (review.product.merchantId !== merchant.id) {
      return NextResponse.json({ code: 1003, message: "无权回复该评价", data: null }, { status: 403 });
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { merchantReply: reply.trim() },
    });

    return NextResponse.json({ code: 0, message: "回复成功", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
