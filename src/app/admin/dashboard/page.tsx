"use client";

// 管理员仪表盘页面：展示平台核心数据概览 + 最近订单 + 待处理退款提醒

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Spin, Alert, Typography } from "antd";
import {
  UserOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  AccountBookOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import type { AdminStats } from "@/types/api";

const { Title, Text } = Typography;

// 订单状态中文映射（与用户端保持一致）
const statusMap: Record<string, { color: string; label: string }> = {
  PENDING_PAYMENT: { color: "orange", label: "待支付" },
  PENDING_SHIPMENT: { color: "blue", label: "待发货" },
  SHIPPED: { color: "cyan", label: "已发货" },
  REFUNDING: { color: "purple", label: "退款中" },
  COMPLETED: { color: "green", label: "已完成" },
  CANCELLED: { color: "default", label: "已取消" },
  REFUNDED: { color: "red", label: "已退款" },
};

/** 金额格式化：Prisma Decimal 序列化为字符串，需 Number 转换 */
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 拉取统计数据
  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setStats(json.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;

  // 待处理退款数大于 0 时给出醒目提醒
  const pendingRefunds = stats?.pendingRefundCount ?? 0;

  return (
    <div>
      <Title level={3}>平台概览</Title>

      {pendingRefunds > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`当前有 ${pendingRefunds} 笔退款申请待处理`}
          action={<Link href="/admin/disputes">前往纠纷处理</Link>}
        />
      )}

      {/* 核心指标卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="注册用户" value={stats?.userCount ?? 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="入驻商家" value={stats?.merchantCount ?? 0} prefix={<ShopOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="在售商品" value={stats?.productCount ?? 0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平台销售额" value={stats?.totalSales ?? 0} precision={2} prefix={<AccountBookOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 订单状态分布 + 待处理退款 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="订单状态分布">
            <Row gutter={8}>
              {Object.entries(stats?.orderStatusCounts ?? {}).map(([status, count]) => (
                <Col key={status} span={8} style={{ marginBottom: 12 }}>
                  <Tag color={statusMap[status]?.color}>{statusMap[status]?.label ?? status}</Tag>
                  <Text strong> {count}</Text>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="待处理事务">
            <Statistic
              title="待处理退款申请"
              value={pendingRefunds}
              prefix={<RollbackOutlined />}
              valueStyle={{ color: pendingRefunds > 0 ? "#faad14" : undefined }}
            />
            <Text type="secondary">（总订单数：{stats?.orderCount ?? 0}）</Text>
          </Card>
        </Col>
      </Row>

      {/* 最近订单 */}
      <Card title="最近订单" style={{ marginTop: 16 }}>
        <Table
          dataSource={stats?.recentOrders ?? []}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            { title: "订单号", dataIndex: "orderNo", width: 200 },
            { title: "买家", dataIndex: "userName", width: 120, render: (v: string | null) => v ?? "—" },
            { title: "金额", dataIndex: "totalAmount", width: 120, render: (v: string) => <Text strong style={{ color: "#e00" }}>{formatPrice(v)}</Text> },
            {
              title: "状态",
              dataIndex: "status",
              width: 100,
              render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label ?? s}</Tag>,
            },
            { title: "下单时间", dataIndex: "createdAt", render: (v: string) => new Date(v).toLocaleString("zh-CN") },
          ]}
        />
      </Card>
    </div>
  );
}
