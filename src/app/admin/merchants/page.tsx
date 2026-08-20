"use client";

// 管理员商家管理页面：查看所有入驻商家、审核入驻、封禁店铺

import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Input, Select, Space, Button, Popconfirm, message, Typography } from "antd";
import type { AdminMerchantItem } from "@/types/api";

const { Title } = Typography;

// 商家状态中文映射
const statusMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: "orange", label: "待审核" },
  ACTIVE: { color: "green", label: "营业中" },
  BANNED: { color: "red", label: "已封禁" },
};

export default function AdminMerchantsPage() {
  const [list, setList] = useState<AdminMerchantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);

  // 拉取商家列表
  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);

    const json = await fetch(`/api/admin/merchants?${params}`).then((r) => r.json());
    if (json.code === 0) {
      setList(json.data.list);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [page, pageSize, keyword, status]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // 更新商家状态（审核通过 / 封禁 / 恢复）
  const handleUpdateStatus = async (id: number, nextStatus: string) => {
    const res = await fetch(`/api/admin/merchants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      fetchMerchants();
    } else {
      message.error(json.message);
    }
  };

  return (
    <div>
      <Title level={3}>商家管理</Title>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索店铺名 / 商家邮箱 / 姓名"
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => { setPage(1); setKeyword(v); }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          options={[
            { value: "PENDING", label: "待审核" },
            { value: "ACTIVE", label: "营业中" },
            { value: "BANNED", label: "已封禁" },
          ]}
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
          showTotal: (t) => `共 ${t} 个商家`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        columns={[
          { title: "ID", dataIndex: "id", width: 60 },
          { title: "店铺名称", dataIndex: "shopName" },
          {
            title: "店铺描述", dataIndex: "description", ellipsis: true,
            render: (v: string | null) => v || "—",
          },
          {
            title: "商家账号", width: 180,
            render: (_: unknown, r: AdminMerchantItem) => r.user ? `${r.user.name}（${r.user.email}）` : "—",
          },
          {
            title: "状态", dataIndex: "status", width: 100,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label ?? s}</Tag>,
          },
          {
            title: "入驻时间", dataIndex: "createdAt", width: 170,
            render: (v: string) => new Date(v).toLocaleString("zh-CN"),
          },
          {
            title: "操作", width: 240,
            render: (_: unknown, record: AdminMerchantItem) => (
              <Space>
                {record.status === "PENDING" && (
                  <Popconfirm
                    title="通过该商家的入驻申请？"
                    onConfirm={() => handleUpdateStatus(record.id, "ACTIVE")}
                  >
                    <Button size="small" type="primary">通过审核</Button>
                  </Popconfirm>
                )}
                {record.status === "ACTIVE" && (
                  <Popconfirm
                    title="封禁该商家？"
                    description="封禁后商家账号将无法登录，商品不可见"
                    onConfirm={() => handleUpdateStatus(record.id, "BANNED")}
                  >
                    <Button size="small" danger>封禁</Button>
                  </Popconfirm>
                )}
                {record.status === "BANNED" && (
                  <Popconfirm
                    title="解除封禁？"
                    description="解封后商家账号可重新登录"
                    onConfirm={() => handleUpdateStatus(record.id, "ACTIVE")}
                  >
                    <Button size="small" type="primary">解封</Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
