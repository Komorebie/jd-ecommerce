"use client";

// 管理员纠纷处理页面：查看全平台退款申请，进行最终强制裁决

import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Input, Select, Space, Button, Modal, Typography, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { AdminRefundItem } from "@/types/api";

const { Title, Text, Paragraph } = Typography;

// 退款状态中文映射
const refundStatusMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: "orange", label: "待商家审核" },
  APPROVED: { color: "blue", label: "商家已同意" },
  RETURNING: { color: "cyan", label: "退货中" },
  REFUNDED: { color: "green", label: "已退款" },
  REJECTED: { color: "red", label: "商家已拒绝" },
  APPEALING: { color: "purple", label: "用户申诉中" },
  CLOSED: { color: "default", label: "已关闭" },
};

/** 金额格式化：Prisma Decimal 序列化为字符串，需 Number 转换 */
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

export default function AdminDisputesPage() {
  const [list, setList] = useState<AdminRefundItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  // 裁决弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRefund, setCurrentRefund] = useState<AdminRefundItem | null>(null);

  // 拉取全平台退款申请列表
  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);

    const json = await fetch(`/api/admin/refunds?${params}`).then((r) => r.json());
    if (json.code === 0) {
      setList(json.data.list);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [page, pageSize, keyword, status]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // 提交最终裁决
  const handleResolve = async (action: "APPROVE" | "REJECT", reason: string) => {
    if (!currentRefund) return;
    const res = await fetch(`/api/admin/refunds/${currentRefund.id}/force-resolve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      setModalOpen(false);
      setCurrentRefund(null);
      fetchRefunds();
    } else {
      message.error(json.message);
    }
  };

  return (
    <div>
      <Title level={3}>纠纷处理</Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        退款纠纷裁决：可对"待商家审核"的退款直接介入，或对用户申诉做最终裁决。裁决通过则立即退款并恢复库存；裁决驳回则流程终结，用户不可再申诉。
      </Text>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索订单号 / 用户"
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => { setPage(1); setKeyword(v); }}
        />
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
            title: "申请人", width: 170,
            render: (_: unknown, r: AdminRefundItem) => `${r.userName}（${r.userEmail}）`,
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
            title: "状态", dataIndex: "status", width: 120,
            render: (s: string) => <Tag color={refundStatusMap[s]?.color}>{refundStatusMap[s]?.label ?? s}</Tag>,
          },
          {
            title: "申请时间", dataIndex: "appliedAt", width: 170,
            render: (v: string) => new Date(v).toLocaleString("zh-CN"),
          },
          {
            title: "操作", width: 120,
            render: (_: unknown, record: AdminRefundItem) =>
              record.status === "PENDING" || record.status === "APPEALING" ? (
                <Button
                  size="small"
                  type="primary"
                  danger
                  onClick={() => { setCurrentRefund(record); setModalOpen(true); }}
                >
                  {record.status === "APPEALING" ? "裁决申诉" : "裁决"}
                </Button>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
        ]}
      />

      {/* 裁决弹窗 */}
      <Modal
        title="退款纠纷最终裁决"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setCurrentRefund(null); }}
        footer={null}
        width={560}
      >
        {currentRefund && (
          <div>
            <Paragraph>
              <Text strong>订单号：</Text>{currentRefund.orderNo}
            </Paragraph>
            <Paragraph>
              <Text strong>申请人：</Text>{currentRefund.userName}（{currentRefund.userEmail}）
            </Paragraph>
            <Paragraph>
              <Text strong>退款原因：</Text>{currentRefund.reason}
            </Paragraph>
            {currentRefund.appealReason && (
              <Paragraph>
                <Text strong>用户申诉理由：</Text>
                <Text type="danger">{currentRefund.appealReason}</Text>
              </Paragraph>
            )}
            <Paragraph>
              <Text strong>退款金额：</Text>
              <Text strong style={{ color: "#e00" }}>{formatPrice(currentRefund.amount)}</Text>
            </Paragraph>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              {currentRefund.status === "APPEALING"
                ? "申诉裁决为最终决定：通过 → 立即退款并恢复库存；驳回 → 流程终结，用户不可再申诉。"
                : "裁决为最终决定：通过 → 立即退款并恢复库存；驳回 → 流程终结。"}
            </Text>
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleResolve("APPROVE", "管理员裁决通过")}
              >
                裁决通过（退款）
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleResolve("REJECT", "管理员裁决驳回")}
              >
                裁决驳回
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}
