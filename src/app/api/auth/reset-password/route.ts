import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { code: 1001, message: "邮箱、验证码和新密码为必填项", data: null },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { code: 1001, message: "新密码至少6位", data: null },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.resetCode) {
      return NextResponse.json(
        { code: 2004, message: "请先获取验证码", data: null },
        { status: 400 },
      );
    }

    if (user.resetCodeExpires && new Date() > user.resetCodeExpires) {
      await prisma.user.update({
        where: { email },
        data: { resetCode: null, resetCodeExpires: null },
      });
      return NextResponse.json(
        { code: 2004, message: "验证码已过期，请重新获取", data: null },
        { status: 400 },
      );
    }

    if (user.resetCode !== code) {
      return NextResponse.json(
        { code: 1001, message: "验证码错误", data: null },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return NextResponse.json({ code: 0, message: "密码重置成功", data: null });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
