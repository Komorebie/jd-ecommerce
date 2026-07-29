import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { children: { select: { id: true, name: true } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ code: 0, message: "success", data: categories });
  } catch {
    return NextResponse.json(
      { code: 3001, message: "服务器内部错误", data: null },
      { status: 500 },
    );
  }
}
