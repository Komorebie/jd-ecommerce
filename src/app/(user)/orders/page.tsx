"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Button, Tag, Typography, Space, Spin, Empty, message, Popconfirm } from "antd";
import Link from "next/link";

const { Title, Text } = Typography;

const statusMap: Record<string, { color: string; label: string }> = {
  PENDING_PAYMENT: { color: "orange", label: "待支付" },
  PENDING_SHIPMENT: { color: "blue", label: "待发货" },
  SHIPPED: { color: "cyan", label: "已发货" },
  REFUNDING: { color: "purple", label: "退款中" },
  COMPLETED: { color: "green", label: "已完成" },
  CANCELLED: { color: "default", label: "已取消" },
  REFUNDED: { color: "red", label: "已退款" },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setOrders(json.data);
        setLoading(false);
      });
  }, []);

  const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

  const handleAction = async (id: number, action: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (res.ok) {
      message.success(json.message);
      const newStatus = action === "pay" ? "PENDING_SHIPMENT" : action === "cancel" ? "CANCELLED" : action === "confirm" ? "COMPLETED" : null;
      setOrders((prev) =>
        prev.map((o) => (o.id === id && newStatus ? { ...o, status: newStatus } : o)),
      );
    } else {
      message.error(json.message);
    }
  };

  // 再次购买：将订单内所有商品重新加入购物车
  const buyAgain = async (order: Record<string, unknown>) => {
    const items = order.items as { productId: number; quantity: number }[] | undefined;
    if (!items?.length) return;
    let ok = true;
    for (const item of items) {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
      });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.message || "加入购物车失败");
        ok = false;
        break;
      }
    }
    if (ok) {
      message.success("已加入购物车，去结算吧");
      router.push("/cart");
    }
  };

  // 删除订单记录（软删除，仅已取消订单）
  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) {
      message.success(json.message);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } else {
      message.error(json.message);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <Title level={3}>我的订单</Title>
      {orders.length === 0 ? (
        <Empty description="暂无订单" style={{ padding: 80 }}>
          <Link href="/products"><Button type="primary">去逛逛</Button></Link>
        </Empty>
      ) : (
        <Table
          dataSource={orders}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "订单号", dataIndex: "orderNo", width: 180 },
            {
              title: "商品", dataIndex: "items",
              render: (items: { productName: string; quantity: number }[]) =>
                items?.map((i) => `${i.productName} ×${i.quantity}`).join(" / ") || "",
            },
            { title: "金额", dataIndex: "totalAmount", width: 120, render: (v: string) => <Text strong style={{ color: "#e00" }}>{formatPrice(v)}</Text> },
            {
              title: "状态", dataIndex: "status", width: 100,
              render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label || s}</Tag>,
            },
            {
              title: "操作", width: 200,
              render: (_: unknown, r: Record<string, unknown>) => (
                <Space>
                  <Button type="link" size="small" onClick={() => router.push(`/orders/${r.id}`)}>详情</Button>
                  {r.status === "PENDING_PAYMENT" && (
                    <>
                      <Button type="link" size="small" onClick={() => handleAction(r.id as number, "pay")}>支付</Button>
                      <Button type="link" size="small" danger onClick={() => handleAction(r.id as number, "cancel")}>取消</Button>
                    </>
                  )}
                  {r.status === "SHIPPED" && (
                    <Button type="link" size="small" onClick={() => handleAction(r.id as number, "confirm")}>确认收货</Button>
                  )}
                  {r.status === "COMPLETED" && (
                    <Button type="link" size="small" onClick={() => buyAgain(r)}>再次购买</Button>
                  )}
                  {r.status === "CANCELLED" && (
                    <Popconfirm
                      title="删除该订单记录？"
                      description="删除后不可恢复"
                      onConfirm={() => handleDelete(r.id as number)}
                    >
                      <Button type="link" size="small" danger>删除记录</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
