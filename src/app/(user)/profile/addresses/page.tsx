"use client";

import { useEffect, useState } from "react";
import {
  Button, Modal, Form, Input, Card, Row, Col, Tag, Typography, Empty, Spin, message, Checkbox, Space, Popconfirm,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Address {
  id: number;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchAddresses = () => {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setAddresses(json.data);
        setLoading(false);
      });
  };

  useEffect(() => { fetchAddresses(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditing(addr);
    form.setFieldsValue(addr);
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    const url = editing ? `/api/addresses/${editing.id}` : "/api/addresses";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      message.success(editing ? "已更新" : "已添加");
      setModalOpen(false);
      fetchAddresses();
    } else {
      message.error(json.message);
    }
  };

  const deleteAddress = async (id: number) => {
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (res.ok) {
      message.success("已删除");
      fetchAddresses();
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}><EnvironmentOutlined /> 收货地址</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增地址</Button>
      </div>

      {addresses.length === 0 ? (
        <Empty description="暂无地址" />
      ) : (
        <Row gutter={[16, 16]}>
          {addresses.map((addr) => (
            <Col key={addr.id} xs={24}>
              <Card
                extra={addr.isDefault && <Tag color="blue">默认</Tag>}
                actions={[
                  <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEdit(addr)}>编辑</Button>,
                  <Popconfirm key="del" title="确定删除？" onConfirm={() => deleteAddress(addr.id)}>
                    <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>,
                ]}
              >
                <Text strong style={{ fontSize: 16 }}>{addr.receiver} {addr.phone}</Text>
                <br />
                <Text type="secondary">
                  {addr.province}{addr.city}{addr.district} {addr.detail}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editing ? "编辑地址" : "新增地址"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="receiver" label="收货人" rules={[{ required: true, message: "请输入" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: "请输入" }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="province" label="省" rules={[{ required: true, message: "请输入" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label="市" rules={[{ required: true, message: "请输入" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="区" rules={[{ required: true, message: "请输入" }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="detail" label="详细地址" rules={[{ required: true, message: "请输入" }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked">
            <Checkbox>设为默认地址</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            {editing ? "保存修改" : "添加地址"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
