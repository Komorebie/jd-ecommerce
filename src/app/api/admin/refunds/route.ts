// 管理端退款列表接口：全平台退款申请，支持状态筛选、关键词搜索、分页

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, parsePagination } from "@/lib/admin";
import { autoCloseExpiredRefunds } from "@/lib/refund";
import type { RefundStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 权限校验：仅管理员可访问
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    // 懒执行超时处理：超过 7 天未寄回的退款自动关闭
    await autoCloseExpiredRefunds();

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const status = searchParams.get("status") as RefundStatus | null;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    // 拼接查询条件
    const where = {
      ...(keyword
        ? {
            OR: [
              { order: { orderNo: { contains: keyword } } },
              { user: { name: { contains: keyword } } },
              { user: { email: { contains: keyword } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    // 查询总数 + 当前页数据（附订单号和用户信息）
    // 排序：待处理的优先（催办过的置顶，其次申请时间早的）
    const [total, list] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        include: {
          order: { select: { orderNo: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: [
          { urgedAt: "desc" },
          { appliedAt: "asc" },
        ],
        skip,
        take,
      }),
    ]);

    // 转换为前端友好的扁平结构
    const data = list.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNo: r.order.orderNo,
      userName: r.user.name,
      userEmail: r.user.email,
      reason: r.reason,
      amount: r.amount,
      status: r.status,
      rejectReason: r.rejectReason,
      appealReason: r.appealReason,
      urgedAt: r.urgedAt,
      urgedCount: r.urgedCount,
      appliedAt: r.appliedAt,
      resolvedAt: r.resolvedAt,
    }));

    return NextResponse.json({ code: 0, message: "success", data: { list: data, total, page, pageSize } });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
