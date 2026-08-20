"use client";

// 管理员用户管理页面：查看所有用户、按条件筛选、封禁/解封、调整角色

import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Input, Select, Space, Button, Popconfirm, message, Typography } from "antd";
import { Role, UserStatus } from "@/types/user";

const { Title } = Typography;

// 角色和状态的中文标签与颜色映射
const roleMap: Record<string, { color: string; label: string }> = {
  USER: { color: "blue", label: "普通用户" },
  MERCHANT: { color: "gold", label: "商家" },
  ADMIN: { color: "red", label: "管理员" },
};

const statusMap: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "green", label: "正常" },
  BANNED: { color: "red", label: "已封禁" },
};

// 用户列表项类型
interface UserItem {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [list, setList] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);

  // 拉取用户列表（筛选条件变化时重新请求）
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword) params.set("keyword", keyword);
    if (role) params.set("role", role);
    if (status) params.set("status", status);

    const json = await fetch(`/api/admin/users?${params}`).then((r) => r.json());
    if (json.code === 0) {
      setList(json.data.list);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [page, pageSize, keyword, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 更新用户状态或角色
  const handleUpdate = async (id: number, data: { status?: UserStatus; role?: Role }) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      fetchUsers();
    } else {
      message.error(json.message);
    }
  };

  return (
    <div>
      <Title level={3}>用户管理</Title>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索邮箱 / 姓名 / 手机号"
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => { setPage(1); setKeyword(v); }}
        />
        <Select
          placeholder="角色筛选"
          allowClear
          style={{ width: 140 }}
          options={[
            { value: "USER", label: "普通用户" },
            { value: "MERCHANT", label: "商家" },
            { value: "ADMIN", label: "管理员" },
          ]}
          onChange={(v) => { setPage(1); setRole(v); }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          options={[
            { value: "ACTIVE", label: "正常" },
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
          showTotal: (t) => `共 ${t} 个用户`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        columns={[
          { title: "ID", dataIndex: "id", width: 60 },
          { title: "邮箱", dataIndex: "email" },
          { title: "姓名", dataIndex: "name", width: 120 },
          { title: "手机号", dataIndex: "phone", width: 140, render: (v: string | null) => v || "—" },
          {
            title: "角色", dataIndex: "role", width: 110,
            render: (r: Role) => <Tag color={roleMap[r]?.color}>{roleMap[r]?.label ?? r}</Tag>,
          },
          {
            title: "状态", dataIndex: "status", width: 100,
            render: (s: UserStatus) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label ?? s}</Tag>,
          },
          {
            title: "注册时间", dataIndex: "createdAt", width: 170,
            render: (v: string) => new Date(v).toLocaleString("zh-CN"),
          },
          {
            title: "操作", width: 220,
            render: (_: unknown, record: UserItem) => (
              <Space>
                {record.status === "ACTIVE" ? (
                  <Popconfirm
                    title="确认封禁该用户？"
                    description="封禁后该用户将无法登录"
                    onConfirm={() => handleUpdate(record.id, { status: UserStatus.BANNED })}
                  >
                    <Button size="small" danger>封禁</Button>
                  </Popconfirm>
                ) : (
                  <Popconfirm
                    title="确认解封该用户？"
                    onConfirm={() => handleUpdate(record.id, { status: UserStatus.ACTIVE })}
                  >
                    <Button size="small" type="primary">解封</Button>
                  </Popconfirm>
                )}
                {record.role !== "ADMIN" && (
                  <Popconfirm
                    title="将角色提升为管理员？"
                    description="管理员拥有全部后台权限，请谨慎操作"
                    onConfirm={() => handleUpdate(record.id, { role: Role.ADMIN })}
                  >
                    <Button size="small">设为管理员</Button>
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
