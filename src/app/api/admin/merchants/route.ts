// 管理端商家列表接口：支持店铺名搜索、状态筛选、分页

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, parsePagination } from "@/lib/admin";
import type { MerchantStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 权限校验：仅管理员可访问
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status") as MerchantStatus | null;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    // 拼接查询条件
    const where = {
      ...(keyword
        ? {
            OR: [
              { shopName: { contains: keyword } },
              { user: { email: { contains: keyword } } },
              { user: { name: { contains: keyword } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    // 查询总数 + 当前页数据，同时带出关联用户信息
    const [total, list] = await Promise.all([
      prisma.merchant.count({ where }),
      prisma.merchant.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, status: true },
          },
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
