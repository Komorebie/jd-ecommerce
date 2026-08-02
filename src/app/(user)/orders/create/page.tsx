"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button, Typography, Radio, Card, Row, Col, Space, Spin, Empty, message, Divider,
} from "antd";
import { Suspense } from "react";

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

function CreateOrder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedIds = searchParams.get("ids")?.split(",").map(Number) || [];

  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/cart").then((r) => r.json()),
      fetch("/api/addresses").then((r) => r.json()),
    ]).then(([cartJson, addrJson]) => {
      if (cartJson.code === 0) {
        setItems(cartJson.data.filter((i: CartItem) => selectedIds.includes(i.id)));
      }
      if (addrJson.code === 0) {
        setAddresses(addrJson.data);
        const def = addrJson.data.find((a: Address) => a.isDefault);
        if (def) setAddressId(def.id);
        else if (addrJson.data.length > 0) setAddressId(addrJson.data[0].id);
      }
      setLoading(false);
    });
  }, [selectedIds]);

  const totalAmount = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;

  const submitOrder = async () => {
    if (!addressId || items.length === 0) {
      message.error("请选择收货地址");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId, cartItemIds: items.map((i) => i.id) }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      message.success("下单成功");
      router.push("/orders");
    } else {
      message.error(json.message);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;

  if (items.length === 0) {
    return <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}><Empty description="没有待结算的商品" /></div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <Title level={3}>确认订单</Title>

      <Card title="收货地址" style={{ marginBottom: 16 }}>
        {addresses.length === 0 ? (
          <Empty description="请先添加收货地址">
            <Button onClick={() => router.push("/profile/addresses")}>去添加</Button>
          </Empty>
        ) : (
          <Radio.Group value={addressId} onChange={(e) => setAddressId(e.target.value)}>
            <Space direction="vertical">
              {addresses.map((a) => (
                <Radio key={a.id} value={a.id}>
                  {a.receiver} {a.phone} &nbsp; {a.province}{a.city}{a.district} {a.detail}
                  {a.isDefault && <Text type="secondary"> (默认)</Text>}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}
        <Button type="link" onClick={() => router.push("/profile/addresses")} style={{ padding: 0, marginTop: 8 }}>
          管理地址
        </Button>
      </Card>

      <Card title="商品清单">
        {items.map((item) => (
          <Row key={item.id} align="middle" style={{ marginBottom: 12 }}>
            <Col flex="64px">
              <img src={item.productImage || "https://picsum.photos/64/64"} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4 }} />
            </Col>
            <Col flex="auto"><Text>{item.productName}</Text></Col>
            <Col><Text>{formatPrice(item.price)} × {item.quantity}</Text></Col>
            <Col flex="100px" style={{ textAlign: "right" }}>
              <Text strong style={{ color: "#e00" }}>{formatPrice(Number(item.price) * item.quantity)}</Text>
            </Col>
          </Row>
        ))}
        <Divider />
        <div style={{ textAlign: "right" }}>
          <Space size="large">
            <Text style={{ fontSize: 16 }}>应付：<Text strong style={{ color: "#e00", fontSize: 24 }}>{formatPrice(totalAmount)}</Text></Text>
            <Button type="primary" size="large" loading={submitting} onClick={submitOrder}>提交订单</Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={<Spin style={{ display: "block", padding: 100 }} />}>
      <CreateOrder />
    </Suspense>
  );
}
