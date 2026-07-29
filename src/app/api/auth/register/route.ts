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

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role === "MERCHANT" ? "MERCHANT" : "USER",
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
