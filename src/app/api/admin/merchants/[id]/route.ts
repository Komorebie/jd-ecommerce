// 管理端商家操作接口：审核商家（通过入驻/封禁店铺）

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { MerchantStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // 权限校验：仅管理员可访问
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const merchantId = Number(params.id);
    const body = (await request.json()) as { status?: MerchantStatus };

    if (!body.status || !["PENDING", "ACTIVE", "BANNED"].includes(body.status)) {
      return NextResponse.json({ code: 1001, message: "非法的商家状态", data: null }, { status: 400 });
    }

    // 校验商家存在
    const target = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!target) {
      return NextResponse.json({ code: 1004, message: "商家不存在", data: null }, { status: 404 });
    }

    // 更新商家状态；若封禁商家，同步封禁其关联账号（防止被封商家继续用商家号登录）
    const updated = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.update({
        where: { id: merchantId },
        data: { status: body.status },
        include: {
          user: {
            select: { id: true, name: true, email: true, status: true },
          },
        },
      });

      if (body.status === "BANNED") {
        await tx.user.update({
          where: { id: merchant.userId },
          data: { status: "BANNED" },
        });
      }

      return merchant;
    });

    const message =
      body.status === "ACTIVE"
        ? "已通过商家入驻审核"
        : body.status === "BANNED"
          ? "商家已封禁（关联账号同步封禁）"
          : "商家状态已更新";

    return NextResponse.json({ code: 0, message, data: updated });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
