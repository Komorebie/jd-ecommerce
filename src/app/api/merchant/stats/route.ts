// 商家端仪表盘统计接口：今日订单数、销售额、商品数、待处理事务

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 权限校验：仅商家可访问
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    // 今日零点（按服务器时区）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 并行统计各维度数据
    const [
      todayOrderCount,
      totalSales,
      productCount,
      lowStockCount,
      pendingRefundCount,
      pendingShipmentCount,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { merchantId: merchant.id, createdAt: { gte: todayStart } } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          merchantId: merchant.id,
          status: { in: ["PENDING_SHIPMENT", "SHIPPED", "COMPLETED", "REFUNDED"] },
        },
      }),
      prisma.product.count({ where: { merchantId: merchant.id, status: "ON_SALE" } }),
      // 库存低于 10 件算低库存预警
      prisma.product.count({ where: { merchantId: merchant.id, status: "ON_SALE", stock: { lt: 10 } } }),
      prisma.refund.count({ where: { order: { merchantId: merchant.id }, status: "PENDING" } }),
      prisma.order.count({ where: { merchantId: merchant.id, status: "PENDING_SHIPMENT" } }),
      prisma.order.findMany({
        where: { merchantId: merchant.id },
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

    return NextResponse.json({
      code: 0,
      message: "success",
      data: {
        shopName: merchant.shopName,
        todayOrderCount,
        totalSales: Number(totalSales._sum.totalAmount ?? 0),
        productCount,
        lowStockCount,
        pendingRefundCount,
        pendingShipmentCount,
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
