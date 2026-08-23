"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Typography, Descriptions, Tag, Spin, message, Divider, Row, Col, Space, Modal, Input, InputNumber, Rate, Alert } from "antd";
import Link from "next/link";

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

// 退款状态中文映射
const refundStatusMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: "orange", label: "待商家审核" },
  APPROVED: { color: "blue", label: "商家已同意，待寄回" },
  RETURNING: { color: "cyan", label: "已寄回，待商家确认收货" },
  REFUNDED: { color: "green", label: "已退款" },
  REJECTED: { color: "red", label: "商家已拒绝" },
  APPEALING: { color: "purple", label: "申诉中，待平台裁决" },
  CLOSED: { color: "default", label: "已关闭" },
};

// 退款记录类型
interface RefundItem {
  id: number;
  status: string;
  reason: string;
  amount: string;
  rejectReason: string | null;
  appealReason: string | null;
  appliedAt: string;
  resolvedAt: string | null;
}

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
  items: { productName: string; productImage: string; price: string; quantity: number }[];
  refunds: RefundItem[];
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
  // 申诉弹窗
  const [appealModal, setAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState("");

  // 拉取订单详情（含退款记录）
  const fetchOrder = async () => {
    setLoading(true);
    const json = await fetch(`/api/orders/${params.id}`).then((r) => r.json());
    if (json.code === 0) setOrder(json.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

  // 当前进行中的退款记录（用于展示状态和操作按钮）
  const activeRefund = order?.refunds?.find((r) =>
    ["PENDING", "APPROVED", "RETURNING", "APPEALING"].includes(r.status),
  ) ?? order?.refunds?.[0];

  // 提交评价
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
      fetchOrder();
    } else {
      message.error(json.message);
    }
  };

  // 申请退款
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
      fetchOrder();
    } else {
      message.error(json.message);
    }
  };

  // 撤销退款申请（48小时内）
  const handleRefundAction = async (refundId: number, action: "cancel" | "return") => {
    const url = action === "cancel" ? `/api/refunds/${refundId}/cancel` : `/api/refunds/${refundId}/return`;
    const res = await fetch(url, { method: "PUT" });
    const json = await res.json();
    if (res.ok) {
      message.success(json.message);
      fetchOrder();
    } else {
      message.error(json.message);
    }
  };

  // 提交申诉
  const submitAppeal = async () => {
    if (!activeRefund) return;
    if (!appealReason.trim()) {
      message.warning("请填写申诉理由");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/refunds/${activeRefund.id}/appeal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appealReason }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      message.success(json.message);
      setAppealModal(false);
      setAppealReason("");
      fetchOrder();
    } else {
      message.error(json.message);
    }
  };

  // 订单基础操作（支付/取消/确认收货）
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
      fetchOrder();
    } else {
      message.error(json.message);
    }
  };

  const openRefund = () => {
    setRefundAmount(Number(order?.totalAmount || 0));
    setRefundReason("");
    setRefundModal(true);
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

      {/* 退款进度卡片：存在退款记录时展示 */}
      {activeRefund && (
        <Card title="退款进度" style={{ marginBottom: 16 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="当前状态">
              <Tag color={refundStatusMap[activeRefund.status]?.color}>
                {refundStatusMap[activeRefund.status]?.label ?? activeRefund.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="退款金额">{formatPrice(activeRefund.amount)}</Descriptions.Item>
            <Descriptions.Item label="退款原因">{activeRefund.reason}</Descriptions.Item>
            <Descriptions.Item label="申请时间">{new Date(activeRefund.appliedAt).toLocaleString("zh-CN")}</Descriptions.Item>
            {activeRefund.rejectReason && (
              <Descriptions.Item label="处理意见">{activeRefund.rejectReason}</Descriptions.Item>
            )}
            {activeRefund.appealReason && (
              <Descriptions.Item label="我的申诉理由">{activeRefund.appealReason}</Descriptions.Item>
            )}
          </Descriptions>

          {/* 退款操作指引 */}
          {activeRefund.status === "PENDING" && (
            <Alert type="info" showIcon message="等待商家审核中。若商家 48 小时内未处理，可联系平台客服介入。" style={{ marginBottom: 12 }} />
          )}
          {activeRefund.status === "APPROVED" && (
            <Alert type="warning" showIcon message="商家已同意退款，请尽快寄回商品（7 天内），否则退款将自动关闭。" style={{ marginBottom: 12 }} />
          )}
          {activeRefund.status === "RETURNING" && (
            <Alert type="info" showIcon message="商品已寄回，等待商家确认收货后完成退款。" style={{ marginBottom: 12 }} />
          )}
          {activeRefund.status === "APPEALING" && (
            <Alert type="info" showIcon message="申诉已提交，平台客服将尽快裁决，请耐心等待。" style={{ marginBottom: 12 }} />
          )}
          {activeRefund.status === "REJECTED" && (
            <Alert type="error" showIcon message="商家已拒绝本次退款。如不认可，可向平台申诉。" style={{ marginBottom: 12 }} />
          )}

          <Space>
            {/* 待审核：48小时内可撤销 */}
            {activeRefund.status === "PENDING" && (
              <Button onClick={() => handleRefundAction(activeRefund.id, "cancel")}>撤销退款申请</Button>
            )}
            {/* 商家已同意：寄回商品 */}
            {activeRefund.status === "APPROVED" && (
              <Button type="primary" onClick={() => handleRefundAction(activeRefund.id, "return")}>确认已寄回商品</Button>
            )}
            {/* 商家已拒绝：申诉 */}
            {activeRefund.status === "REJECTED" && (
              <Button type="primary" danger onClick={() => setAppealModal(true)}>向平台申诉</Button>
            )}
          </Space>
        </Card>
      )}

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
                  onClick={() => { setReviewProdId(idx); setReviewRating(5); setReviewContent(""); setReviewModal(true); }}
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
          {(order.status === "PENDING_SHIPMENT" || order.status === "SHIPPED" || order.status === "COMPLETED") && (
            <Button danger onClick={openRefund}>申请退款</Button>
          )}
          {order.status === "SHIPPED" && (
            <Button type="primary" onClick={() => handleAction("confirm")}>确认收货</Button>
          )}
        </Space>
      </div>

      {/* 评价弹窗 */}
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

      {/* 申请退款弹窗 */}
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

      {/* 申诉弹窗 */}
      <Modal
        title="向平台申诉"
        open={appealModal}
        onCancel={() => setAppealModal(false)}
        onOk={submitAppeal}
        confirmLoading={submitting}
        okText="提交申诉"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="商家拒绝理由"
            description={activeRefund?.rejectReason || "无"}
          />
          <div>
            <Typography.Text>申诉理由（必填）</Typography.Text>
            <Input.TextArea
              rows={4}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="请说明你申诉的理由和依据，平台将据此裁决"
              maxLength={200}
              showCount
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
