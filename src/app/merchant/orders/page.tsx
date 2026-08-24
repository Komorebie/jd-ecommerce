"use client";

// 商家订单管理页面：查看本店订单、确认发货

import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Input, Select, Space, Button, Popconfirm, message, Typography, Modal, Form } from "antd";
import type { MerchantOrderItem } from "@/types/api";

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

export default function MerchantOrdersPage() {
  const [list, setList] = useState<MerchantOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  // 详情弹窗
  const [detailOrder, setDetailOrder] = useState<MerchantOrderItem | null>(null);
  // 发货弹窗
  const [shipOrder, setShipOrder] = useState<MerchantOrderItem | null>(null);
  const [shipForm] = Form.useForm<{ trackingNo: string }>();

  // 拉取本店订单列表
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);

    const json = await fetch(`/api/merchant/orders?${params}`).then((r) => r.json());
    if (json.code === 0) {
      setList(json.data.list);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [page, pageSize, keyword, status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 确认发货
  const handleShip = async (id: number) => {
    const values = await shipForm.validateFields();
    const res = await fetch(`/api/merchant/orders/${id}/ship`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNo: values.trackingNo }),
    });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      setShipOrder(null);
      setDetailOrder(null);
      shipForm.resetFields();
      fetchOrders();
    } else {
      message.error(json.message);
    }
  };

  return (
    <div>
      <Title level={3}>订单管理</Title>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索订单号 / 买家"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => { setPage(1); setKeyword(v); }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 130 }}
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
            title: "买家", width: 140,
            render: (_: unknown, r: MerchantOrderItem) => r.user?.name ?? "—",
          },
          {
            title: "商品", ellipsis: true,
            render: (_: unknown, r: MerchantOrderItem) =>
              r.items?.map((i) => `${i.productName} ×${i.quantity}`).join(" / ") || "",
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
            title: "操作", width: 160,
            render: (_: unknown, record: MerchantOrderItem) => (
              <Space>
                <Button size="small" type="link" onClick={() => setDetailOrder(record)}>详情</Button>
                {record.status === "PENDING_SHIPMENT" && (
                  <Button size="small" type="primary" onClick={() => { setShipOrder(record); shipForm.resetFields(); }}>
                    发货
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      {/* 订单详情弹窗：展示商品明细和收货地址 */}
      <Modal
        title={`订单详情 - ${detailOrder?.orderNo ?? ""}`}
        open={!!detailOrder}
        onCancel={() => setDetailOrder(null)}
        footer={
          detailOrder?.status === "PENDING_SHIPMENT" ? (
            <Button type="primary" onClick={() => { setShipOrder(detailOrder); shipForm.resetFields(); }}>
              确认发货
            </Button>
          ) : null
        }
        width={620}
      >
        {detailOrder && (
          <div>
            {/* 收货信息 */}
            <div style={{ marginBottom: 16, padding: 12, background: "#fafafa", borderRadius: 6 }}>
              <Text strong>收货信息</Text>
              <div style={{ marginTop: 8 }}>
                {detailOrder.address
                  ? `${detailOrder.address.receiver}  ${detailOrder.address.phone}`
                  : "—"}
              </div>
              <div>
                {detailOrder.address
                  ? `${detailOrder.address.province}${detailOrder.address.city}${detailOrder.address.district} ${detailOrder.address.detail}`
                  : ""}
              </div>
              {detailOrder.remark && <div>买家备注：{detailOrder.remark}</div>}
              {detailOrder.trackingNo && <div>物流单号：{detailOrder.trackingNo}</div>}
            </div>
            {/* 商品明细 */}
            <Text strong>商品明细</Text>
            <div style={{ marginTop: 8 }}>
              {detailOrder.items?.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <Space>
                    <img
                      src={item.productImage || "https://picsum.photos/48/48"}
                      alt={item.productName}
                      width={48}
                      height={48}
                      style={{ objectFit: "cover", borderRadius: 4 }}
                    />
                    <div>
                      <div>{item.productName}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatPrice(item.price)} × {item.quantity}
                      </Text>
                    </div>
                  </Space>
                  <Text strong>{formatPrice(Number(item.price) * item.quantity)}</Text>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right", marginTop: 12 }}>
              <Text strong style={{ fontSize: 16, color: "#e00" }}>
                合计：{formatPrice(detailOrder.totalAmount)}
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* 发货弹窗：填写物流单号 */}
      <Modal
        title={`确认发货 - ${shipOrder?.orderNo ?? ""}`}
        open={!!shipOrder}
        onCancel={() => setShipOrder(null)}
        onOk={() => shipOrder && handleShip(shipOrder.id)}
        okText="确认发货"
        width={480}
      >
        <Form form={shipForm} layout="vertical">
          <Form.Item
            name="trackingNo"
            label="物流单号"
            rules={[{ required: true, message: "请输入物流单号" }]}
            extra="发货后订单状态将变为已发货，用户可查看物流信息"
          >
            <Input placeholder="例如：SF1234567890" maxLength={40} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
