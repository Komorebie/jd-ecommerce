"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Typography, message, Steps } from "antd";
import { MailOutlined, LockOutlined, NumberOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title } = Typography;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendCode = async (values: { email: string }) => {
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();

    if (!res.ok) {
      message.error(json.message);
      setLoading(false);
      return;
    }

    setEmail(values.email);
    message.success(`验证码：${json.data.code}（模拟发送到邮箱）`);
    setStep(1);
    setLoading(false);
  };

  const resetPassword = async (values: { code: string; newPassword: string }) => {
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: values.code, newPassword: values.newPassword }),
    });
    const json = await res.json();

    if (!res.ok) {
      message.error(json.message);
      setLoading(false);
      return;
    }

    message.success("密码重置成功，请登录");
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
      <div style={{ width: 420, padding: 40, background: "#fff", borderRadius: 8 }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 32 }}>
          忘记密码
        </Title>

        <Steps
          current={step}
          items={[{ title: "验证邮箱" }, { title: "重置密码" }]}
          style={{ marginBottom: 32 }}
          size="small"
        />

        {step === 0 && (
          <Form layout="vertical" onFinish={sendCode} autoComplete="off" size="large">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "请输入邮箱" },
                { type: "email", message: "邮箱格式不正确" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入注册邮箱" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                获取验证码
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 1 && (
          <Form layout="vertical" onFinish={resetPassword} autoComplete="off" size="large">
            <Form.Item
              name="code"
              rules={[
                { required: true, message: "请输入验证码" },
                { len: 6, message: "验证码为6位数字" },
              ]}
            >
              <Input prefix={<NumberOutlined />} placeholder="6位验证码" maxLength={6} />
            </Form.Item>
            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: "请输入新密码" },
                { min: 6, message: "密码至少6位" },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                重置密码
              </Button>
            </Form.Item>
            <div style={{ textAlign: "center" }}>
              <a onClick={() => { setStep(0); }}>返回上一步</a>
            </div>
          </Form>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/login">返回登录</Link>
        </div>
      </div>
    </div>
  );
}
