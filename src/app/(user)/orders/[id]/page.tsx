"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Typography, Descriptions, Tag, Spin, message, Divider, Row, Col, Space, Modal, Input, InputNumber, Rate } from "antd";
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

interface OrderDetail {
  id: number;
  orderNo: string;
  totalAmount: string;
  status: string;
  paidAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  merchant: { shopName: string };
  address: { receiver: string; phone: string; province: string; city: string; district: string; detail: string };
  items: { productId: number; productName: string; productImage: string; price: string; quantity: number }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundModal, setRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewProdId, setReviewProdId] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setOrder(json.data);
        setLoading(false);
      });
  }, [params.id]);

  const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

  const submitReview = async () => {
    if (!order || !reviewProdId) return;
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: reviewProdId, orderId: order.id, rating: reviewRating, content: reviewContent }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      message.success("评价成功");
      setReviewModal(false);
      // Mark item as reviewed
      const items = order.items.map((i) =>
        i.productId === reviewProdId ? { ...i, reviewed: true } : i
      );
      setOrder({ ...order, items } as OrderDetail);
    } else {
      message.error(json.message);
    }
  };

  const handleRefund = async () => {
    if (!order || !refundReason || refundAmount <= 0) {
      message.error("请填写退款原因和金额");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, reason: refundReason, amount: refundAmount }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      message.success(json.message);
      setRefundModal(false);
      setOrder({ ...order, status: json.data.status === "APPROVED" ? "REFUNDED" : "REFUNDING" });
    } else {
      message.error(json.message);
    }
  };

  const openRefund = () => {
    setRefundAmount(Number(order?.totalAmount || 0));
    setRefundReason("");
    setRefundModal(true);
  };

  const handleAction = async (action: string) => {
    if (!order) return;
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (res.ok) {
      message.success(json.message);
      const newStatus = action === "pay" ? "PENDING_SHIPMENT" : action === "cancel" ? "CANCELLED" : action === "confirm" ? "COMPLETED" : order.status;
      setOrder({ ...order, status: newStatus });
    } else {
      message.error(json.message);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;
  if (!order) return <div style={{ textAlign: "center", padding: 100 }}><Title level={4}>订单不存在</Title></div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <Title level={3}>订单详情</Title>
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusMap[order.status]?.color}>{statusMap[order.status]?.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="商家">{order.merchant.shopName}</Descriptions.Item>
          <Descriptions.Item label="下单时间">{new Date(order.createdAt).toLocaleString("zh-CN")}</Descriptions.Item>
          {order.paidAt && <Descriptions.Item label="支付时间">{new Date(order.paidAt).toLocaleString("zh-CN")}</Descriptions.Item>}
          {order.shippedAt && <Descriptions.Item label="发货时间">{new Date(order.shippedAt).toLocaleString("zh-CN")}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Card title="收货信息" style={{ marginBottom: 16 }}>
        <Text>{order.address.receiver} {order.address.phone} &nbsp; {order.address.province}{order.address.city}{order.address.district} {order.address.detail}</Text>
      </Card>

      <Card title="商品清单">
        {order.items.map((item, idx) => (
          <Row key={idx} align="middle" style={{ marginBottom: 12 }}>
            <Col flex="64px">
              <img src={item.productImage || "https://picsum.photos/64/64"} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4 }} />
            </Col>
            <Col flex="auto">
              <Text>{item.productName}</Text>
              {order.status === "COMPLETED" && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => { setReviewProdId(item.productId); setReviewRating(5); setReviewContent(""); setReviewModal(true); }}
                  style={{ padding: 0, marginLeft: 8 }}
                >
                  评价
                </Button>
              )}
            </Col>
            <Col><Text>{formatPrice(item.price)} × {item.quantity}</Text></Col>
            <Col flex="100px" style={{ textAlign: "right" }}>
              <Text strong style={{ color: "#e00" }}>{formatPrice(Number(item.price) * item.quantity)}</Text>
            </Col>
          </Row>
        ))}
        <Divider />
        <div style={{ textAlign: "right" }}>
          <Text style={{ fontSize: 16 }}>合计：<Text strong style={{ color: "#e00", fontSize: 20 }}>{formatPrice(order.totalAmount)}</Text></Text>
        </div>
      </Card>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <Space>
          <Button onClick={() => router.push("/orders")}>返回列表</Button>
          {order.status === "PENDING_PAYMENT" && (
            <>
              <Button type="primary" onClick={() => handleAction("pay")}>去支付</Button>
              <Button danger onClick={() => handleAction("cancel")}>取消订单</Button>
            </>
          )}
          {(order.status === "PENDING_SHIPMENT" || order.status === "SHIPPED") && (
            <Button danger onClick={openRefund}>申请退款</Button>
          )}
          {order.status === "SHIPPED" && (
            <Button type="primary" onClick={() => handleAction("confirm")}>确认收货</Button>
          )}
        </Space>
      </div>

      <Modal
        title="评价商品"
        open={reviewModal}
        onCancel={() => setReviewModal(false)}
        onOk={submitReview}
        confirmLoading={submitting}
        okText="提交评价"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Rate value={reviewRating} onChange={setReviewRating} />
          </div>
          <Input.TextArea
            rows={3}
            value={reviewContent}
            onChange={(e) => setReviewContent(e.target.value)}
            placeholder="写点评价吧（选填）"
          />
        </Space>
      </Modal>

      <Modal
        title="申请退款"
        open={refundModal}
        onCancel={() => setRefundModal(false)}
        onOk={handleRefund}
        confirmLoading={submitting}
        okText="提交申请"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Typography.Text>退款金额</Typography.Text>
            <InputNumber
              min={0.01}
              max={Number(order?.totalAmount || 0)}
              value={refundAmount}
              onChange={(v) => setRefundAmount(v || 0)}
              prefix="¥"
              style={{ width: "100%" }}
            />
            <Typography.Text type="secondary">
              最多可退 {formatPrice(order?.totalAmount || 0)}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text>退款原因</Typography.Text>
            <Input.TextArea
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="请说明退款原因"
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
