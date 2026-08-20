// 管理端仪表盘统计接口：平台核心数据概览

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 权限校验：仅管理员可访问
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    // 并行统计各维度数据
    const [userCount, merchantCount, productCount, orderCount, totalSales, pendingRefundCount, recentOrders] =
      await Promise.all([
        prisma.user.count({ where: { role: "USER" } }),
        prisma.merchant.count(),
        prisma.product.count(),
        prisma.order.count(),
        // 统计已支付订单的总销售额（排除待支付/已取消）
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { status: { in: ["PENDING_SHIPMENT", "SHIPPED", "COMPLETED", "REFUNDED"] } },
        }),
        prisma.refund.count({ where: { status: "PENDING" } }),
        // 最近 5 笔订单
        prisma.order.findMany({
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { id: "desc" },
          take: 5,
        }),
      ]);

    // 按订单状态分组统计数量
    const grouped = await prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    const orderStatusCounts: Record<string, number> = {};
    for (const g of grouped) {
      orderStatusCounts[g.status] = g._count.status;
    }

    return NextResponse.json({
      code: 0,
      message: "success",
      data: {
        userCount,
        merchantCount,
        productCount,
        orderCount,
        totalSales: Number(totalSales._sum.totalAmount ?? 0),
        pendingRefundCount,
        orderStatusCounts,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt,
          userName: o.user?.name ?? null,
        })),
      },
    });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
