"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  InputNumber,
  Typography,
  Empty,
  Spin,
  Popconfirm,
  message,
  Space,
  Checkbox,
} from "antd";
import { DeleteOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title, Text } = Typography;

interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  price: string;
  stock: number;
  quantity: number;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchCart = () => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setItems(json.data);
        setLoading(false);
      });
  };

  useEffect(() => { fetchCart(); }, []);

  const updateQty = async (id: number, qty: number | null) => {
    if (!qty || qty < 1) return;
    setUpdating(id);
    const res = await fetch(`/api/cart/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });
    const json = await res.json();
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
      );
    } else {
      message.error(json.message);
    }
    setUpdating(null);
  };

  const removeItem = async (id: number) => {
    const res = await fetch(`/api/cart/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      message.success("已移出购物车");
    }
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const indeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const totalAmount = selectedItems.reduce(
    (sum, i) => sum + Number(i.price) * i.quantity,
    0,
  );

  const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

  const columns = [
    {
      title: "",
      dataIndex: "id",
      width: 50,
      render: (id: number) => (
        <Checkbox
          checked={selectedIds.has(id)}
          onChange={(e) => toggleOne(id, e.target.checked)}
        />
      ),
    },
    {
      title: "商品",
      dataIndex: "productName",
      render: (name: string, record: CartItem) => (
        <Space>
          <img
            src={record.productImage || "https://picsum.photos/80/80"}
            alt={name}
            style={{
              width: 80,
              height: 80,
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
          <Link href={`/products/${record.productId}`}>{name}</Link>
        </Space>
      ),
    },
    {
      title: "单价",
      dataIndex: "price",
      width: 120,
      render: (p: string) => formatPrice(p),
    },
    {
      title: "数量",
      dataIndex: "quantity",
      width: 140,
      render: (qty: number, record: CartItem) => (
        <InputNumber
          min={1}
          max={record.stock}
          value={qty}
          onChange={(v) => updateQty(record.id, v)}
          disabled={updating === record.id}
        />
      ),
    },
    {
      title: "小计",
      width: 120,
      render: (_: unknown, r: CartItem) => (
        <Text strong style={{ color: "#e00" }}>
          {formatPrice(Number(r.price) * r.quantity)}
        </Text>
      ),
    },
    {
      title: "操作",
      width: 80,
      render: (_: unknown, r: CartItem) => (
        <Popconfirm title="确定移出购物车？" onConfirm={() => removeItem(r.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <Title level={3}>
        <ShoppingCartOutlined /> 我的购物车
      </Title>

      {items.length === 0 ? (
        <Empty description="购物车是空的" style={{ padding: 80 }}>
          <Link href="/products">
            <Button type="primary">去逛逛</Button>
          </Link>
        </Empty>
      ) : (
        <>
          <Table
            dataSource={items}
            rowKey="id"
            pagination={false}
            columns={columns}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 24,
              padding: "16px 0",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Space>
              <Checkbox
                checked={allSelected}
                indeterminate={indeterminate}
                onChange={(e) => toggleAll(e.target.checked)}
              >
                全选
              </Checkbox>
              {selectedIds.size > 0 && (
                <Button
                  type="link"
                  danger
                  size="small"
                  onClick={() => {
                    selectedIds.forEach((id) => removeItem(id));
                  }}
                >
                  删除选中
                </Button>
              )}
            </Space>

            <Space size="large">
              <Text>
                已选{" "}
                <Text strong>{selectedIds.size}</Text>{" "}
                件
              </Text>
              <Text style={{ fontSize: 18 }}>
                合计：
                <Text strong style={{ color: "#e00", fontSize: 24 }}>
                  {formatPrice(totalAmount)}
                </Text>
              </Text>
              <Button
                type="primary"
                size="large"
                disabled={selectedIds.size === 0}
                onClick={() => router.push("/orders/create")}
              >
                结算 ({selectedIds.size})
              </Button>
            </Space>
          </div>
        </>
      )}
    </div>
  );
}
