import { prisma } from "@/lib/prisma";

/** 商家超时自动退款阈值：超过 48 小时未处理即自动同意（指南 3.3.2） */
export const REFUND_TIMEOUT_HOURS = 48;

/**
 * 扫描超过 48 小时仍未处理的退款申请，自动同意（与商家手动同意逻辑一致）：
 * - 退款状态 PENDING -> APPROVED，记录处理时间
 * - 订单状态 REFUNDING -> REFUNDED
 * - 恢复商品库存
 * @returns 本次自动处理的退款单数
 */
export async function autoApproveExpiredRefunds(): Promise<number> {
  const deadline = new Date(Date.now() - REFUND_TIMEOUT_HOURS * 60 * 60 * 1000);

  const expiredRefunds = await prisma.refund.findMany({
    where: {
      status: "PENDING",
      appliedAt: { lt: deadline },
    },
    include: { order: { include: { items: true } } },
  });

  let handled = 0;
  for (const refund of expiredRefunds) {
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: "REFUNDED" },
      });
      for (const item of refund.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });
    handled++;
  }

  return handled;
}
