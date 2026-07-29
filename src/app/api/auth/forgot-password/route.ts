import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { code: 1001, message: "请输入邮箱", data: null },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { code: 1004, message: "该邮箱未注册", data: null },
        { status: 404 },
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { email },
      data: {
        resetCode: code,
        resetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return NextResponse.json({
      code: 0,
      message: "验证码已生成（模拟发送到邮箱）",
      data: { code },
    });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
