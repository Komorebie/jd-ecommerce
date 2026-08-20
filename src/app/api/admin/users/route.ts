// 管理端用户列表接口：支持关键词搜索（邮箱/姓名/手机号）、角色筛选、分页

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, parsePagination } from "@/lib/admin";
import type { Role, UserStatus } from "@prisma/client";

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
    const role = searchParams.get("role") as Role | null;
    const status = searchParams.get("status") as UserStatus | null;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    // 拼接查询条件
    const where = {
      ...(keyword
        ? {
            OR: [
              { email: { contains: keyword } },
              { name: { contains: keyword } },
              { phone: { contains: keyword } },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    };

    // 查询总数 + 当前页数据（不返回密码哈希）
    const [total, list] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
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
