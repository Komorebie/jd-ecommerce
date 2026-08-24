// 退款流程公共逻辑：状态回退计算、超时自动处理
// 供用户端、商家端、管理端的退款接口复用，保证三端状态机一致

import { prisma } from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

/** 用户可在申请后 48 小时内撤销退款申请 */
export const REFUND_CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000;

/** 商家同意后，用户须在 7 天内寄回商品，否则退款自动关闭 */
export const RETURN_DEADLINE_MS = 7 * 24 * 60 * 60 * 1000;

/** 商家超时自动同意退款阈值：超过 48 小时未处理即自动同意（指南 3.3.2） */
export const REFUND_TIMEOUT_HOURS = 48;

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
      await appendRefundEvent(tx, refund.id, "CLOSED", "超过 7 天未寄回商品，退款自动关闭");
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

export interface RefundTimelineEvent {
  status: string;
  note: string;
  time: string;
}

/** 追加一条退款流程时间线记录（申请/审核/寄回/退款/申诉等），tx 可传事务客户端 */
export async function appendRefundEvent(
  tx: typeof prisma | Prisma.TransactionClient,
  refundId: number,
  status: string,
  note: string,
) {
  const refund = await tx.refund.findUnique({ where: { id: refundId }, select: { timeline: true } });
  const prev: RefundTimelineEvent[] = Array.isArray(refund?.timeline)
    ? (refund?.timeline as unknown as RefundTimelineEvent[])
    : [];
  const event: RefundTimelineEvent = { status, note, time: new Date().toISOString() };
  await tx.refund.update({
    where: { id: refundId },
    data: { timeline: [...prev, event] as unknown as Prisma.InputJsonValue },
  });
}

/**
 * 扫描超过 48 小时仍未处理的退款申请，自动同意（与商家手动同意逻辑一致）：
 * - 退款状态 PENDING -> APPROVED，记录处理时间，等待用户寄回商品
 * - 库存待商家确认收货时统一恢复，此处不处理
 * @returns 本次自动处理的退款单数
 */
export async function autoApproveExpiredRefunds(): Promise<number> {
  const deadline = new Date(Date.now() - REFUND_TIMEOUT_HOURS * 60 * 60 * 1000);

  const expiredRefunds = await prisma.refund.findMany({
    where: {
      status: "PENDING",
      appliedAt: { lt: deadline },
    },
  });

  let handled = 0;
  for (const refund of expiredRefunds) {
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
      await appendRefundEvent(tx, refund.id, "APPROVED", "商家超过 48 小时未处理，系统自动同意退款");
    });
    handled++;
  }

  return handled;
}
