import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { code: 1001, message: "无效的商品ID", data: null },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        merchant: { select: { shopName: true } },
      },
    });

    if (!product || product.status === "BANNED") {
      return NextResponse.json(
        { code: 1004, message: "商品不存在", data: null },
        { status: 404 },
      );
    }

    return NextResponse.json({ code: 0, message: "success", data: product });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
