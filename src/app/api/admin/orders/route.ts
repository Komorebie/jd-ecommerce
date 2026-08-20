// 管理端订单列表接口：全平台订单，支持订单号搜索、状态筛选、分页

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, parsePagination } from "@/lib/admin";
import type { OrderStatus } from "@prisma/client";

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
    const status = searchParams.get("status") as OrderStatus | null;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    // 拼接查询条件
    const where = {
      ...(keyword
        ? {
            OR: [
              { orderNo: { contains: keyword } },
              { user: { name: { contains: keyword } } },
              { merchant: { shopName: { contains: keyword } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    // 查询总数 + 当前页数据（附用户/商家信息和商品项数）
    const [total, list] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          merchant: { select: { id: true, shopName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { id: "desc" },
        skip,
        take,
      }),
    ]);

    // 转换为前端友好的扁平结构（itemCount 代替 _count）
    const data = list.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      totalAmount: o.totalAmount,
      status: o.status,
      paidAt: o.paidAt,
      shippedAt: o.shippedAt,
      completedAt: o.completedAt,
      cancelledAt: o.cancelledAt,
      createdAt: o.createdAt,
      user: o.user,
      merchant: o.merchant,
      itemCount: o._count.items,
    }));

    return NextResponse.json({ code: 0, message: "success", data: { list: data, total, page, pageSize } });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
