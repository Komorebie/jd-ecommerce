"use client";

// 商家仪表盘页面：展示本店今日订单、销售额、待发货、待处理退款、低库存预警

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Spin, Alert, Typography } from "antd";
import {
  ShoppingCartOutlined,
  AccountBookOutlined,
  RollbackOutlined,
  SendOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import type { MerchantStats } from "@/types/api";

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

/** 金额格式化：Prisma Decimal 序列化为字符串，需 Number 转换 */
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

export default function MerchantDashboardPage() {
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 拉取本店统计数据
  useEffect(() => {
    fetch("/api/merchant/stats")
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setStats(json.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;

  const pendingRefunds = stats?.pendingRefundCount ?? 0;
  const pendingShipment = stats?.pendingShipmentCount ?? 0;
  const lowStock = stats?.lowStockCount ?? 0;

  return (
    <div>
      <Title level={3}>{stats?.shopName ?? "我的店铺"}</Title>

      {/* 待办提醒 */}
      {(pendingRefunds > 0 || pendingShipment > 0 || lowStock > 0) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            [
              pendingShipment > 0 ? `${pendingShipment} 笔订单待发货` : "",
              pendingRefunds > 0 ? `${pendingRefunds} 笔退款待审核` : "",
              lowStock > 0 ? `${lowStock} 件商品库存不足` : "",
            ]
              .filter(Boolean)
              .join("，")
          }
          action={<Link href="/merchant/orders">前往处理</Link>}
        />
      )}

      {/* 核心指标卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="今日订单" value={stats?.todayOrderCount ?? 0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="累计销售额" value={stats?.totalSales ?? 0} precision={2} prefix={<AccountBookOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待发货订单"
              value={pendingShipment}
              prefix={<SendOutlined />}
              valueStyle={{ color: pendingShipment > 0 ? "#1677ff" : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核退款"
              value={pendingRefunds}
              prefix={<RollbackOutlined />}
              valueStyle={{ color: pendingRefunds > 0 ? "#faad14" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* 商品概况 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="商品概况">
            <Statistic title="在售商品数" value={stats?.productCount ?? 0} />
            {lowStock > 0 && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginTop: 12 }}
                message={`有 ${lowStock} 件商品库存低于 10，请及时补货`}
                action={<Link href="/merchant/products">去补货</Link>}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="本店概览">
            <Text>在售商品：{stats?.productCount ?? 0} 件</Text>
            <br />
            <Text>今日新增订单：{stats?.todayOrderCount ?? 0} 笔</Text>
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
