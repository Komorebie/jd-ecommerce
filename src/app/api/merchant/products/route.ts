// 商家端商品接口：查看本店商品列表 + 上架新商品

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant, parsePagination } from "@/lib/merchant";
import type { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 权限校验：仅商家可访问
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status") as ProductStatus | null;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    // 只查询本店商品
    const where = {
      merchantId: merchant.id,
      ...(keyword ? { name: { contains: keyword } } : {}),
      ...(status ? { status } : {}),
    };

    const [total, list] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { id: "desc" },
        skip,
        take,
      }),
    ]);

    return NextResponse.json({ code: 0, message: "success", data: { list, total, page, pageSize } });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 权限校验：仅商家可访问
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      categoryId?: number;
      images?: string[];
    };

    // 参数校验
    if (!body.name?.trim() || !body.description?.trim()) {
      return NextResponse.json({ code: 1001, message: "请填写商品名称和描述", data: null }, { status: 400 });
    }
    if (body.price === undefined || body.price < 0 || body.stock === undefined || body.stock < 0) {
      return NextResponse.json({ code: 1001, message: "价格和库存必须为非负数", data: null }, { status: 400 });
    }
    if (!body.categoryId) {
      return NextResponse.json({ code: 1001, message: "请选择商品分类", data: null }, { status: 400 });
    }

    // 校验分类存在
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) {
      return NextResponse.json({ code: 1004, message: "分类不存在", data: null }, { status: 404 });
    }

    // 创建商品，默认状态为在售
    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        categoryId: body.categoryId,
        name: body.name.trim(),
        description: body.description.trim(),
        price: body.price,
        stock: body.stock,
        images: body.images ?? [],
        status: "ON_SALE",
      },
    });

    return NextResponse.json({ code: 0, message: "商品上架成功", data: product }, { status: 201 });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
