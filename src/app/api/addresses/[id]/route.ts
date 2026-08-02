import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.id ?? null;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const addr = await prisma.address.findUnique({ where: { id: Number(params.id) } });
    if (!addr || addr.userId !== userId) {
      return NextResponse.json({ code: 1004, message: "地址不存在", data: null }, { status: 404 });
    }

    const { receiver, phone, province, city, district, detail, isDefault } = await request.json();

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const updated = await prisma.address.update({
      where: { id: Number(params.id) },
      data: { receiver, phone, province, city, district, detail, isDefault: !!isDefault },
    });

    return NextResponse.json({ code: 0, message: "地址已更新", data: updated });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ code: 1002, message: "请先登录", data: null }, { status: 401 });
    }

    const addr = await prisma.address.findUnique({ where: { id: Number(params.id) } });
    if (!addr || addr.userId !== userId) {
      return NextResponse.json({ code: 1004, message: "地址不存在", data: null }, { status: 404 });
    }

    await prisma.address.delete({ where: { id: Number(params.id) } });

    return NextResponse.json({ code: 0, message: "地址已删除", data: null });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
