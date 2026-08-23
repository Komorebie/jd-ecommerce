// 退款流程公共逻辑：状态回退计算、超时自动处理
// 供用户端、商家端、管理端的退款接口复用，保证三端状态机一致

import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

/** 用户可在申请后 48 小时内撤销退款申请 */
export const REFUND_CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000;

/** 商家同意后，用户须在 7 天内寄回商品，否则退款自动关闭 */
export const RETURN_DEADLINE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 计算订单恢复到退款前的状态
 * 依据订单的各时间节点反推：有完成时间→已完成；有发货时间→已发货；有支付时间→待发货；否则→待支付
 */
export function computeRevertStatus(order: {
  completedAt: Date | null;
  shippedAt: Date | null;
  paidAt: Date | null;
}): OrderStatus {
  if (order.completedAt) return "COMPLETED";
  if (order.shippedAt) return "SHIPPED";
  if (order.paidAt) return "PENDING_SHIPMENT";
  return "PENDING_PAYMENT";
}

/**
 * 将订单恢复到退款前状态（封装的写入操作）
 */
export async function revertOrderStatus(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const revertStatus = computeRevertStatus(order);
  await prisma.order.update({
    where: { id: orderId },
    data: { status: revertStatus },
  });
}

/**
 * 恢复订单商品的库存
 */
export async function restoreOrderStock(orderId: number) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

/**
 * 超时自动处理（懒执行）：商家已同意退款、但用户超过 7 天未寄回的申请自动关闭
 * 项目未引入定时任务，采用查询时触发的方式实现
 * 在各端退款列表查询接口开头调用
 */
export async function autoCloseExpiredRefunds(): Promise<void> {
  const deadline = new Date(Date.now() - RETURN_DEADLINE_MS);

  // 找出所有已同意但超过 7 天未寄回的退款申请
  const expired = await prisma.refund.findMany({
    where: {
      status: "APPROVED",
      resolvedAt: { lte: deadline },
    },
    include: { order: true },
  });

  for (const refund of expired) {
    // 事务：关闭退款 + 订单恢复原状态（用户未寄回，商品视为未退回）
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: "CLOSED",
          rejectReason: "超过 7 天未寄回商品，退款申请已自动关闭",
        },
      });
      if (refund.order.status === "REFUNDING") {
        await tx.order.update({
          where: { id: refund.orderId },
          data: { status: computeRevertStatus(refund.order) },
        });
      }
    });
  }
}

/**
 * 判断订单是否处于退款流程中（不可重复申请退款）
 */
export function isRefundActive(status: string): boolean {
  return ["PENDING", "APPROVED", "RETURNING", "APPEALING"].includes(status);
}
