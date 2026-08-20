// 管理端用户操作接口：修改用户状态（封禁/解封）或角色

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { Role, UserStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // 权限校验：仅管理员可访问
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ code: 1003, message: "无权限访问", data: null }, { status: 403 });
    }

    const targetId = Number(params.id);
    const body = (await request.json()) as { status?: UserStatus; role?: Role };

    // 参数校验
    if (!body.status && !body.role) {
      return NextResponse.json({ code: 1001, message: "请提供要修改的字段", data: null }, { status: 400 });
    }
    if (body.status && !["ACTIVE", "BANNED"].includes(body.status)) {
      return NextResponse.json({ code: 1001, message: "非法的用户状态", data: null }, { status: 400 });
    }
    if (body.role && !["USER", "MERCHANT", "ADMIN"].includes(body.role)) {
      return NextResponse.json({ code: 1001, message: "非法的用户角色", data: null }, { status: 400 });
    }

    // 校验目标用户存在
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ code: 1004, message: "用户不存在", data: null }, { status: 404 });
    }

    // 禁止管理员自己封禁自己，防止后台无管理员可用
    if (target.id === admin.id && body.status === "BANNED") {
      return NextResponse.json({ code: 2002, message: "不能封禁自己的账号", data: null }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.role ? { role: body.role } : {}),
      },
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
    });

    return NextResponse.json({ code: 0, message: "用户信息已更新", data: updated });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
