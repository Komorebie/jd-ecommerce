"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Select, Typography, message } from "antd";
import { MailOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();

    if (!res.ok) {
      message.error(json.message || "注册失败");
      setLoading(false);
      return;
    }

    message.success("注册成功，请登录");
    router.push("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5",
      }}
    >
      <div style={{ width: 400, padding: 40, background: "#fff", borderRadius: 8 }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 32 }}>
          创建账号
        </Title>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>
          <Form.Item
            name="name"
            rules={[{ required: true, message: "请输入姓名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="姓名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少6位" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item
            name="role"
            initialValue="USER"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <Select
              options={[
                { value: "USER", label: "普通用户" },
                { value: "MERCHANT", label: "商家" },
              ]}
              placeholder="选择角色"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
          <div style={{ textAlign: "center" }}>
            已有账号？<Link href="/login">去登录</Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
