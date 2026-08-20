"use client";

// 管理员订单管理页面：查看全平台订单，支持强制取消（平台介入场景）

import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Input, Select, Space, Button, Popconfirm, message, Typography } from "antd";
import type { AdminOrderItem } from "@/types/api";

const { Title, Text } = Typography;

// 订单状态中文映射
const statusMap: Record<string, { color: string; label: string }> = {
  PENDING_PAYMENT: { color: "orange", label: "待支付" },
  PENDING_SHIPMENT: { color: "blue", label: "待发货" },
  SHIPPED: { color: "cyan", label: "已发货" },
  REFUNDING: { color: "purple", label: "退款中" },
  COMPLETED: { color: "green", label: "已完成" },
  CANCELLED: { color: "default", label: "已取消" },
  REFUNDED: { color: "red", label: "已退款" },
};

// 终态订单不允许强制取消
const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "REFUNDED"];

/** 金额格式化：Prisma Decimal 序列化为字符串，需 Number 转换 */
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

export default function AdminOrdersPage() {
  const [list, setList] = useState<AdminOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);

  // 拉取全平台订单列表
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);

    const json = await fetch(`/api/admin/orders?${params}`).then((r) => r.json());
    if (json.code === 0) {
      setList(json.data.list);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [page, pageSize, keyword, status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 强制取消订单
  const handleForceCancel = async (id: number) => {
    const res = await fetch(`/api/admin/orders/${id}/force-cancel`, { method: "PUT" });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      fetchOrders();
    } else {
      message.error(json.message);
    }
  };

  return (
    <div>
      <Title level={3}>订单管理</Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        全平台订单。强制取消用于平台介入场景：取消后库存自动恢复，关联退款申请自动关闭。
      </Text>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索订单号 / 买家 / 店铺"
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => { setPage(1); setKeyword(v); }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          options={Object.entries(statusMap).map(([value, item]) => ({ value, label: item.label }))}
          onChange={(v) => { setPage(1); setStatus(v); }}
        />
      </Space>

      <Table
        dataSource={list}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 笔订单`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        columns={[
          { title: "订单号", dataIndex: "orderNo", width: 200 },
          {
            title: "买家", width: 160,
            render: (_: unknown, r: AdminOrderItem) => r.user ? `${r.user.name}（${r.user.email}）` : "—",
          },
          {
            title: "店铺", width: 140,
            render: (_: unknown, r: AdminOrderItem) => r.merchant?.shopName ?? "—",
          },
          {
            title: "商品数", dataIndex: "itemCount", width: 80, align: "center" as const,
          },
          {
            title: "金额", dataIndex: "totalAmount", width: 110,
            render: (v: string) => <Text strong style={{ color: "#e00" }}>{formatPrice(v)}</Text>,
          },
          {
            title: "状态", dataIndex: "status", width: 100,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label ?? s}</Tag>,
          },
          {
            title: "下单时间", dataIndex: "createdAt", width: 170,
            render: (v: string) => new Date(v).toLocaleString("zh-CN"),
          },
          {
            title: "操作", width: 120,
            render: (_: unknown, record: AdminOrderItem) =>
              !TERMINAL_STATUSES.includes(record.status) ? (
                <Popconfirm
                  title="强制取消该订单？"
                  description="取消后库存恢复、关联退款自动关闭，此操作不可撤销"
                  onConfirm={() => handleForceCancel(record.id)}
                >
                  <Button size="small" danger>强制取消</Button>
                </Popconfirm>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
        ]}
      />
    </div>
  );
}
