// 商家端订单接口：查看本店订单列表，支持状态筛选和关键词搜索

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant, parsePagination } from "@/lib/merchant";
import type { OrderStatus } from "@prisma/client";

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
    const status = searchParams.get("status") as OrderStatus | null;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    // 只查询本店订单
    const where = {
      merchantId: merchant.id,
      ...(keyword
        ? {
            OR: [
              { orderNo: { contains: keyword } },
              { user: { name: { contains: keyword } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    const [total, list] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          address: { select: { receiver: true, phone: true, province: true, city: true, district: true, detail: true } },
          items: { select: { id: true, productName: true, productImage: true, price: true, quantity: true } },
        },
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
