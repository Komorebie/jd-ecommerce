import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  return user?.id ?? null;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { code: 1002, message: "请先登录", data: null },
        { status: 401 },
      );
    }

    const { quantity } = await request.json();
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { code: 1001, message: "数量至少为1", data: null },
        { status: 400 },
      );
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: Number(params.id) },
      include: { product: { select: { stock: true } } },
    });

    if (!item || item.userId !== userId) {
      return NextResponse.json(
        { code: 1004, message: "购物车项不存在", data: null },
        { status: 404 },
      );
    }

    if (quantity > item.product.stock) {
      return NextResponse.json(
        { code: 2001, message: `库存不足，最多 ${item.product.stock} 件`, data: null },
        { status: 400 },
      );
    }

    await prisma.cartItem.update({
      where: { id: Number(params.id) },
      data: { quantity },
    });

    return NextResponse.json({ code: 0, message: "已更新", data: null });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { code: 1002, message: "请先登录", data: null },
        { status: 401 },
      );
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: Number(params.id) },
    });

    if (!item || item.userId !== userId) {
      return NextResponse.json(
        { code: 1004, message: "购物车项不存在", data: null },
        { status: 404 },
      );
    }

    await prisma.cartItem.delete({ where: { id: Number(params.id) } });

    return NextResponse.json({ code: 0, message: "已移出购物车", data: null });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
