import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { code: 1002, message: "请先登录", data: null },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json(
        { code: 1004, message: "用户不存在", data: null },
        { status: 404 },
      );
    }

    const items = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: { name: true, price: true, stock: true, images: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = items
      .filter((i) => i.product.status === "ON_SALE")
      .map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        productImage: (i.product.images as string[])?.[0] || "",
        price: i.product.price,
        stock: i.product.stock,
        quantity: i.quantity,
      }));

    return NextResponse.json({ code: 0, message: "success", data: result });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { code: 1002, message: "请先登录", data: null },
        { status: 401 },
      );
    }

    const { productId, quantity } = await request.json();
    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { code: 1001, message: "参数错误", data: null },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json(
        { code: 1004, message: "用户不存在", data: null },
        { status: 404 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.status !== "ON_SALE") {
      return NextResponse.json(
        { code: 1004, message: "商品不存在或已下架", data: null },
        { status: 404 },
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { code: 2001, message: "库存不足", data: null },
        { status: 400 },
      );
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) {
        return NextResponse.json(
          { code: 2001, message: `库存不足，最多可加 ${product.stock - existing.quantity} 件`, data: null },
          { status: 400 },
        );
      }
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: { userId: user.id, productId, quantity },
      });
    }

    return NextResponse.json({ code: 0, message: "已加入购物车", data: null });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
