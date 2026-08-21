// 商家端退款接口：查看本店退款申请列表，支持状态筛选

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant, parsePagination } from "@/lib/merchant";
import type { RefundStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 权限校验：仅商家可访问
    const merchant = await requireMerchant();
    if (!merchant) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as RefundStatus | null;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    // 只查询本店订单的退款申请
    const where = {
      order: { merchantId: merchant.id },
      ...(status ? { status } : {}),
    };

    const [total, list] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        include: {
          order: { select: { orderNo: true, status: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { id: "desc" },
        skip,
        take,
      }),
    ]);

    // 转换为前端友好的扁平结构
    const data = list.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNo: r.order.orderNo,
      orderStatus: r.order.status,
      userName: r.user.name,
      userEmail: r.user.email,
      reason: r.reason,
      amount: r.amount,
      status: r.status,
      rejectReason: r.rejectReason,
      appliedAt: r.appliedAt,
      resolvedAt: r.resolvedAt,
    }));

    return NextResponse.json({ code: 0, message: "success", data: { list: data, total, page, pageSize } });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
