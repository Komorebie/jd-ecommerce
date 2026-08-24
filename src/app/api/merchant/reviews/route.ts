// 商家端评价管理接口：查看本店商品收到的评价

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where = {
      product: { merchantId: merchant.id },
      ...(productId ? { productId: Number(productId) } : {}),
    };

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true } },
        product: { select: { id: true, name: true, images: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      productImage: (r.product.images as string[])?.[0] || "",
      userName: r.user.name,
      rating: r.rating,
      content: r.content,
      merchantReply: r.merchantReply,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ code: 0, message: "success", data });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
