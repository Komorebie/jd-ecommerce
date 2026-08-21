import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { code: 1001, message: "邮箱、密码和姓名为必填项", data: null },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { code: 2002, message: "该邮箱已被注册", data: null },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 商家角色注册时，同时创建店铺记录（状态 PENDING，等待平台审核）
    // 使用嵌套创建保证用户和店铺同时写入，避免出现"有商家账号无店铺"的状态
    const user = role === "MERCHANT"
      ? await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            role: "MERCHANT",
            merchant: {
              create: {
                shopName: `${name}的店铺`,
                description: "新入驻店铺，等待平台审核",
                status: "PENDING",
              },
            },
          },
          select: { id: true, email: true, name: true, role: true },
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            role: "USER",
          },
          select: { id: true, email: true, name: true, role: true },
        });

    return NextResponse.json(
      { code: 0, message: "注册成功", data: user },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
