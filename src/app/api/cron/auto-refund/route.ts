import { NextResponse } from "next/server";
import { autoApproveExpiredRefunds } from "@/lib/refund";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * 定时任务入口：商家超时 48h 未处理退款 → 自动同意。
 * 仅管理员可调用（可配合外部 cron 定时请求本接口）。
 */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ code: 1003, message: "无权限", data: null }, { status: 403 });
  }

  try {
    const count = await autoApproveExpiredRefunds();
    return NextResponse.json({ code: 0, message: `已自动处理 ${count} 笔超时退款`, data: { count } });
  } catch {
    return NextResponse.json({ code: 3001, message: "服务器内部错误", data: null }, { status: 500 });
  }
}
