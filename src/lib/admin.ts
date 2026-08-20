// 管理端公共鉴权逻辑：所有 /api/admin/* 接口统一走这里校验管理员身份

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * 校验当前登录用户是否为管理员
 * @returns 是管理员则返回用户对象，否则返回 null
 */
export async function requireAdmin(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // 账号被管理员封禁后不允许继续操作
  if (!user || user.role !== "ADMIN" || user.status === "BANNED") return null;
  return user;
}

/** 解析分页参数：page 从 1 开始，pageSize 限制在 1-100 之间 */
export function parsePagination(searchParams: URLSearchParams): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
