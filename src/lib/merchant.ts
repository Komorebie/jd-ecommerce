// 商家端公共鉴权逻辑：所有 /api/merchant/* 接口统一走这里校验商家身份

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Merchant } from "@prisma/client";

/**
 * 校验当前登录用户是否为有效商家
 * 条件：账号角色为 MERCHANT、账号未封禁、店铺状态为营业中或待审核
 * @returns 是有效商家则返回商家记录，否则返回 null
 */
export async function requireMerchant(): Promise<Merchant | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { merchant: true },
  });

  // 角色不对或账号被封禁则拒绝
  if (!user || user.role !== "MERCHANT" || user.status === "BANNED") return null;
  // 尚未入驻或店铺被封禁则拒绝
  if (!user.merchant || user.merchant.status === "BANNED") return null;

  return user.merchant;
}

/** 解析分页参数：page 从 1 开始，pageSize 限制在 1-100 之间 */
export function parsePagination(searchParams: URLSearchParams): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
