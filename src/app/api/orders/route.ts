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

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId, deletedAt: null },
      include: {
        items: true,
        address: { select: { receiver: true, phone: true, province: true, city: true, district: true, detail: true } },
        merchant: { select: { shopName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ code: 0, message: "success", data: orders });
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

    const { addressId, cartItemIds } = await request.json();
    if (!addressId || !cartItemIds?.length) {
      return NextResponse.json({ code: 1001, message: "请选择地址和商品", data: null }, { status: 400 });
    }

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      return NextResponse.json({ code: 1004, message: "地址不存在", data: null }, { status: 400 });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { id: { in: cartItemIds }, userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ code: 1004, message: "购物车项不存在", data: null }, { status: 400 });
    }

    // Group by merchant
    const byMerchant = new Map<number, typeof cartItems>();
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const list = byMerchant.get(item.product.merchantId) || [];
      list.push(item);
      byMerchant.set(item.product.merchantId, list);
    }

    const orderNo = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

    // 事务 + 条件扣减库存（防超卖）：创建订单、扣库存、清购物车整体原子
    let orders: unknown[] = [];
    try {
      orders = await prisma.$transaction(async (tx) => {
        const created: unknown[] = [];
        const merchantKeys = Array.from(byMerchant.keys());
        for (let m = 0; m < merchantKeys.length; m++) {
          const merchantId = merchantKeys[m];
          const items = byMerchant.get(merchantId)!;
          const totalAmount = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

          const order = await tx.order.create({
            data: {
              orderNo: `${orderNo}_${merchantId}`,
              userId,
              merchantId,
              addressId,
              totalAmount,
              items: {
                create: items.map((i) => ({
                  productId: i.productId,
                  productName: i.product.name,
                  productImage: (i.product.images as string[])?.[0] || "",
                  price: i.product.price,
                  quantity: i.quantity,
                })),
              },
            },
            include: { items: true },
          });

          // 条件扣减：仅当库存充足时扣减，并发下防止超卖
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const result = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (result.count === 0) {
              throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`);
            }
          }

          created.push(order);
        }

        // Clear cart items
        await tx.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });

        return created;
      });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("INSUFFICIENT_STOCK:")) {
        const productName = e.message.slice("INSUFFICIENT_STOCK:".length);
        return NextResponse.json({
          code: 2001,
          message: `"${productName}" 库存不足`,
          data: null,
        }, { status: 400 });
      }
      throw e;
    }

    return NextResponse.json({ code: 0, message: "下单成功", data: orders }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
