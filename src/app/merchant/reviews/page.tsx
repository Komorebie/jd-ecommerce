"use client";

// 商家评价管理页面：查看本店商品收到的评价，回复/修改回复

import { useCallback, useEffect, useState } from "react";
import {
  Table, Typography, Space, Button, Modal, Input, Rate, message, Image, Tag, Empty,
} from "antd";
import { MessageOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ReviewItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  userName: string;
  rating: number;
  content: string | null;
  merchantReply: string | null;
  createdAt: string;
}

export default function MerchantReviewsPage() {
  const [list, setList] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState(false);
  const [replyingReview, setReplyingReview] = useState<ReviewItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const json = await fetch("/api/merchant/reviews").then((r) => r.json());
    if (json.code === 0) setList(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const openReply = (review: ReviewItem) => {
    setReplyingReview(review);
    setReplyText(review.merchantReply ?? "");
    setReplyModal(true);
  };

  const submitReply = async () => {
    if (!replyingReview || !replyText.trim()) {
      message.warning("请输入回复内容");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/merchant/reviews/${replyingReview.id}/reply`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: replyText }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      message.success(json.message);
      setReplyModal(false);
      fetchReviews();
    } else {
      message.error(json.message);
    }
  };

  return (
    <div>
      <Title level={3}>评价管理</Title>
      {list.length === 0 && !loading ? (
        <Empty description="暂无评价" style={{ padding: 80 }} />
      ) : (
        <Table
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "商品", width: 260,
              render: (_: unknown, r: ReviewItem) => (
                <Space>
                  <Image src={r.productImage || "https://picsum.photos/48/48"} width={40} height={40} style={{ objectFit: "cover", borderRadius: 4 }} preview={false} />
                  <Text>{r.productName}</Text>
                </Space>
              ),
            },
            { title: "用户", dataIndex: "userName", width: 120 },
            {
              title: "评分", dataIndex: "rating", width: 120,
              render: (v: number) => <Rate disabled value={v} style={{ fontSize: 14 }} />,
            },
            {
              title: "评价内容", dataIndex: "content",
              render: (c: string | null) => c || <Text type="secondary">—</Text>,
            },
            {
              title: "回复状态", dataIndex: "merchantReply", width: 100,
              render: (r: string | null) =>
                r ? <Tag color="green">已回复</Tag> : <Tag>未回复</Tag>,
            },
            {
              title: "评价时间", dataIndex: "createdAt", width: 120,
              render: (v: string) => new Date(v).toLocaleDateString("zh-CN"),
            },
            {
              title: "操作", width: 120,
              render: (_: unknown, r: ReviewItem) => (
                <Button type="link" size="small" icon={<MessageOutlined />} onClick={() => openReply(r)}>
                  {r.merchantReply ? "修改回复" : "回复"}
                </Button>
              ),
            },
          ]}
        />
      )}

      <Modal
        title={replyingReview?.merchantReply ? "修改回复" : "回复评价"}
        open={replyModal}
        onCancel={() => setReplyModal(false)}
        onOk={submitReply}
        confirmLoading={submitting}
        okText="提交"
      >
        {replyingReview && (
          <div style={{ marginBottom: 16, padding: 12, background: "#fafafa", borderRadius: 6 }}>
            <Space>
              <Text strong>{replyingReview.userName}</Text>
              <Rate disabled value={replyingReview.rating} style={{ fontSize: 12 }} />
            </Space>
            <div style={{ marginTop: 4, color: "#666" }}>{replyingReview.content}</div>
          </div>
        )}
        <TextArea
          rows={3}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="回复买家评价"
          maxLength={200}
          showCount
        />
      </Modal>
    </div>
  );
}
