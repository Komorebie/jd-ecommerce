// 商家端商品操作接口：编辑商品信息 / 上架 / 下架

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";
import type { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // 权限校验：仅商家可访问
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const productId = Number(params.id);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      categoryId?: number;
      images?: string[];
      status?: ProductStatus;
    };

    // 校验商品属于当前商家（防止越权操作他人商品）
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ code: 1004, message: "商品不存在", data: null }, { status: 404 });
    }
    if (product.merchantId !== merchant.id) {
      return NextResponse.json({ code: 1003, message: "无权操作该商品", data: null }, { status: 403 });
    }

    // 参数校验
    if (body.price !== undefined && body.price < 0) {
      return NextResponse.json({ code: 1001, message: "价格不能为负数", data: null }, { status: 400 });
    }
    if (body.stock !== undefined && body.stock < 0) {
      return NextResponse.json({ code: 1001, message: "库存不能为负数", data: null }, { status: 400 });
    }
    if (body.status && !["ON_SALE", "OFF_SHELF"].includes(body.status)) {
      return NextResponse.json({ code: 1001, message: "非法的商品状态", data: null }, { status: 400 });
    }

    // 更新商品
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.stock !== undefined ? { stock: body.stock } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.images !== undefined ? { images: body.images } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    const message = body.status === "ON_SALE" ? "商品已上架" : body.status === "OFF_SHELF" ? "商品已下架" : "商品信息已更新";

    return NextResponse.json({ code: 0, message, data: updated });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
