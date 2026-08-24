"use client";

// 商家退款处理页面：查看本店退款申请，同意退款或填写理由拒绝

import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Select, Space, Button, Modal, Typography, Input, message } from "antd";
import type { MerchantRefundItem } from "@/types/api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 退款状态中文映射
const refundStatusMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: "orange", label: "待审核" },
  APPROVED: { color: "blue", label: "已同意，待用户寄回" },
  RETURNING: { color: "cyan", label: "用户已寄回" },
  REFUNDED: { color: "green", label: "已退款" },
  REJECTED: { color: "red", label: "已拒绝" },
  APPEALING: { color: "purple", label: "用户申诉中" },
  CLOSED: { color: "default", label: "已关闭" },
};

/** 金额格式化：Prisma Decimal 序列化为字符串，需 Number 转换 */
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

export default function MerchantRefundsPage() {
  const [list, setList] = useState<MerchantRefundItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [status, setStatus] = useState<string | undefined>(undefined);
  // 拒绝弹窗状态
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [currentRefund, setCurrentRefund] = useState<MerchantRefundItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 拉取本店退款申请列表
  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set("status", status);

    const json = await fetch(`/api/merchant/refunds?${params}`).then((r) => r.json());
    if (json.code === 0) {
      setList(json.data.list);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [page, pageSize, status]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // 同意退款（进入退货流程，等待用户寄回）
  const handleApprove = async (id: number) => {
    const res = await fetch(`/api/merchant/refunds/${id}/approve`, { method: "PUT" });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      fetchRefunds();
    } else {
      message.error(json.message);
    }
  };

  // 确认收货（用户寄回后，确认收货完成退款）
  const handleConfirmReceipt = async (id: number) => {
    const res = await fetch(`/api/merchant/refunds/${id}/confirm-receipt`, { method: "PUT" });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      fetchRefunds();
    } else {
      message.error(json.message);
    }
  };

  // 提交拒绝理由
  const handleReject = async () => {
    if (!currentRefund) return;
    if (!rejectReason.trim()) {
      message.warning("请填写拒绝理由");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/merchant/refunds/${currentRefund.id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectReason }),
      });
      const json = await res.json();
      if (json.code === 0) {
        message.success(json.message);
        setRejectModalOpen(false);
        setCurrentRefund(null);
        setRejectReason("");
        fetchRefunds();
      } else {
        message.error(json.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={3}>退款处理</Title>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          options={Object.entries(refundStatusMap).map(([value, item]) => ({ value, label: item.label }))}
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
          showTotal: (t) => `共 ${t} 笔退款申请`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        columns={[
          { title: "订单号", dataIndex: "orderNo", width: 200 },
          {
            title: "买家", width: 160,
            render: (_: unknown, r: MerchantRefundItem) => `${r.userName}（${r.userEmail}）`,
          },
          {
            title: "退款原因", dataIndex: "reason", ellipsis: true,
          },
          {
            title: "申诉理由", dataIndex: "appealReason", ellipsis: true,
            render: (v: string | null) => v || "—",
          },
          {
            title: "金额", dataIndex: "amount", width: 110,
            render: (v: string) => <Text strong style={{ color: "#e00" }}>{formatPrice(v)}</Text>,
          },
          {
            title: "状态", dataIndex: "status", width: 150,
            render: (s: string) => <Tag color={refundStatusMap[s]?.color}>{refundStatusMap[s]?.label ?? s}</Tag>,
          },
          {
            title: "申请时间", dataIndex: "appliedAt", width: 170,
            render: (v: string) => new Date(v).toLocaleString("zh-CN"),
          },
          {
            title: "操作", width: 160,
            render: (_: unknown, record: MerchantRefundItem) => (
              <>
                {record.status === "PENDING" && (
                  <Space>
                    <Button size="small" type="primary" onClick={() => handleApprove(record.id)}>同意</Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => { setCurrentRefund(record); setRejectModalOpen(true); }}
                    >
                      拒绝
                    </Button>
                  </Space>
                )}
                {record.status === "RETURNING" && (
                  <Button size="small" type="primary" onClick={() => handleConfirmReceipt(record.id)}>确认收货</Button>
                )}
                {record.status === "APPEALING" && (
                  <Text type="secondary">等待平台裁决</Text>
                )}
                {!["PENDING", "RETURNING", "APPEALING"].includes(record.status) && (
                  <Text type="secondary">—</Text>
                )}
              </>
            ),
          },
        ]}
      />

      {/* 拒绝退款弹窗：必须填写理由 */}
      <Modal
        title="拒绝退款申请"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => { setRejectModalOpen(false); setCurrentRefund(null); setRejectReason(""); }}
        confirmLoading={submitting}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        {currentRefund && (
          <div>
            <Paragraph>
              <Text strong>订单号：</Text>{currentRefund.orderNo}
            </Paragraph>
            <Paragraph>
              <Text strong>买家：</Text>{currentRefund.userName}
            </Paragraph>
            <Paragraph>
              <Text strong>退款原因：</Text>{currentRefund.reason}
            </Paragraph>
            <TextArea
              rows={3}
              placeholder="请填写拒绝理由，买家可在订单中查看。若买家不认可，可向平台申诉"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={200}
              showCount
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
