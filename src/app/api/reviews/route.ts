import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ code: 1001, message: "缺少productId", data: null }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId: Number(productId) },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const data = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      merchantReply: r.merchantReply,
      createdAt: r.createdAt,
      user: r.user,
    }));

    return NextResponse.json({ code: 0, message: "success", data });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ code: 1004, message: "用户不存在", data: null }, { status: 404 });
    }

    const { productId, orderId, rating, content } = await request.json();
    if (!productId || !orderId || !rating) {
      return NextResponse.json({ code: 1001, message: "参数不完整", data: null }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== user.id) {
      return NextResponse.json({ code: 1003, message: "无权评价此订单", data: null }, { status: 403 });
    }
    if (order.status !== "COMPLETED") {
      return NextResponse.json({ code: 2002, message: "仅可评价已完成订单", data: null }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: { userId: user.id, productId, orderId, rating, content },
    });

    return NextResponse.json({ code: 0, message: "评价成功", data: review }, { status: 201 });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
