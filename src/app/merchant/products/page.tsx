"use client";

// 商家商品管理页面：查看本店商品、上架新商品、编辑商品、上下架

import { useCallback, useEffect, useState } from "react";
import {
  Table, Tag, Input, Select, Space, Button, Modal, Form, InputNumber,
  Popconfirm, message, Typography, Image, Tooltip,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ProductStatus } from "@/types/product";

const { Title, Text } = Typography;
const { TextArea } = Input;

// 商品状态中文映射
const statusMap: Record<string, { color: string; label: string }> = {
  ON_SALE: { color: "green", label: "在售" },
  OFF_SHELF: { color: "default", label: "已下架" },
  BANNED: { color: "red", label: "平台封禁" },
};

// 商品列表项类型
interface ProductItem {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  images: string[];
  status: ProductStatus;
  salesCount: number;
  createdAt: string;
  category: { id: number; name: string } | null;
}

// 分类类型
interface CategoryItem {
  id: number;
  name: string;
  parentId: number | null;
}

/** 金额格式化：Prisma Decimal 序列化为字符串，需 Number 转换 */
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

// 表单数据类型
interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  images: string[];
}

export default function MerchantProductsPage() {
  const [list, setList] = useState<ProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<ProductStatus | undefined>(undefined);
  // 分类列表（用于表单下拉框）
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ProductFormData>();

  // 拉取本店商品列表
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);

    const json = await fetch(`/api/merchant/products?${params}`).then((r) => r.json());
    if (json.code === 0) {
      setList(json.data.list);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [page, pageSize, keyword, status]);

  // 拉取分类列表（新增商品时选择）
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setCategories(json.data);
      });
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 打开新增弹窗
  const openCreateModal = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalOpen(true);
  };

  // 打开编辑弹窗（回填数据）
  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    form.setFieldsValue({
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,
      categoryId: product.category?.id,
      images: product.images,
    });
    setModalOpen(true);
  };

  // 提交新增或编辑
  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const url = editingProduct ? `/api/merchant/products/${editingProduct.id}` : "/api/merchant/products";
      const res = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.code === 0) {
        message.success(json.message);
        setModalOpen(false);
        fetchProducts();
      } else {
        message.error(json.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 上下架操作
  const handleChangeStatus = async (product: ProductItem, nextStatus: ProductStatus) => {
    const res = await fetch(`/api/merchant/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (json.code === 0) {
      message.success(json.message);
      fetchProducts();
    } else {
      message.error(json.message);
    }
  };

  return (
    <div>
      <Title level={3}>商品管理</Title>

      {/* 筛选栏 + 新增按钮 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索商品名称"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => { setPage(1); setKeyword(v); }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 130 }}
          options={[
            { value: "ON_SALE", label: "在售" },
            { value: "OFF_SHELF", label: "已下架" },
          ]}
          onChange={(v) => { setPage(1); setStatus(v); }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          上架新商品
        </Button>
      </Space>

      <Table
        dataSource={list}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 件商品`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        columns={[
          {
            title: "商品", width: 320,
            render: (_: unknown, r: ProductItem) => (
              <Space>
                <Image
                  src={(r.images?.[0]) || "https://picsum.photos/60/60"}
                  width={48}
                  height={48}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                  preview={false}
                />
                <div>
                  <div>{r.name}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {r.description.length > 30 ? `${r.description.slice(0, 30)}…` : r.description}
                  </Text>
                </div>
              </Space>
            ),
          },
          {
            title: "分类", dataIndex: "category", width: 110,
            render: (c: CategoryItem | null) => c?.name ?? "—",
          },
          {
            title: "售价", dataIndex: "price", width: 110,
            render: (v: string) => <Text strong style={{ color: "#e00" }}>{formatPrice(v)}</Text>,
          },
          {
            title: "库存", dataIndex: "stock", width: 90,
            render: (v: number) => <Text type={v < 10 ? "danger" : undefined}>{v}</Text>,
          },
          {
            title: "销量", dataIndex: "salesCount", width: 80,
          },
          {
            title: "状态", dataIndex: "status", width: 100,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label ?? s}</Tag>,
          },
          {
            title: "操作", width: 220,
            render: (_: unknown, record: ProductItem) => (
              <Space>
                <Button size="small" type="link" onClick={() => openEditModal(record)}>编辑</Button>
                {record.status === "ON_SALE" ? (
                  <Popconfirm
                    title="下架该商品？"
                    description="下架后用户端将不可见，可随时重新上架"
                    onConfirm={() => handleChangeStatus(record, ProductStatus.OFF_SHELF)}
                  >
                    <Button size="small" type="link" danger>下架</Button>
                  </Popconfirm>
                ) : (
                  <Popconfirm
                    title="重新上架该商品？"
                    onConfirm={() => handleChangeStatus(record, ProductStatus.ON_SALE)}
                  >
                    <Button size="small" type="link">上架</Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      {/* 新增/编辑商品弹窗 */}
      <Modal
        title={editingProduct ? "编辑商品" : "上架新商品"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={560}
      >
        <Form form={form} layout="vertical" initialValues={{ price: 0, stock: 0, images: [] }}>
          <Form.Item
            name="name"
            label="商品名称"
            rules={[{ required: true, message: "请输入商品名称" }]}
          >
            <Input placeholder="例如：iPhone 16 Pro Max 256GB" maxLength={60} />
          </Form.Item>
          <Form.Item
            name="description"
            label="商品描述"
            rules={[{ required: true, message: "请输入商品描述" }]}
          >
            <TextArea rows={3} placeholder="描述商品的核心卖点和规格参数" maxLength={500} showCount />
          </Form.Item>
          <Space size="large" style={{ display: "flex" }}>
            <Form.Item
              name="price"
              label="售价（元）"
              rules={[{ required: true, message: "请输入售价" }]}
            >
              <InputNumber min={0} precision={2} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item
              name="stock"
              label="库存数量"
              rules={[{ required: true, message: "请输入库存" }]}
            >
              <InputNumber min={0} precision={0} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item
              name="categoryId"
              label="商品分类"
              rules={[{ required: true, message: "请选择分类" }]}
            >
              <Select
                style={{ width: 180 }}
                placeholder="选择分类"
                options={categories
                  .filter((c) => c.parentId)
                  .map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          </Space>
          <Form.Item
            name="images"
            label="商品图片URL（每行一个）"
            extra="粘贴图片链接，多张图片每行一个。可以先用 https://picsum.photos/400/400 占位"
          >
            <TextArea rows={3} placeholder={"https://example.com/1.jpg\nhttps://example.com/2.jpg"} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
