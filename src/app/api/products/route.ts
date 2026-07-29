import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("keyword") || "";
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const minPrice = searchParams.get("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined;
    const maxPrice = searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize")) || 20, 1),
      100,
    );

    const priceFilter: Record<string, number> = {};
    if (minPrice !== undefined) priceFilter.gte = minPrice;
    if (maxPrice !== undefined) priceFilter.lte = maxPrice;

    const where: Prisma.ProductWhereInput = {
      status: "ON_SALE",
      ...(keyword && {
        name: { contains: keyword, mode: "insensitive" as Prisma.QueryMode },
      }),
      ...(categoryId && { categoryId }),
      ...(Object.keys(priceFilter).length > 0 && { price: priceFilter }),
    };

    const [list, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      code: 0,
      message: "success",
      data: { list, total, page, pageSize },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
