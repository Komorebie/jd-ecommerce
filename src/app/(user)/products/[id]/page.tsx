"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Row,
  Col,
  Typography,
  Button,
  InputNumber,
  Tag,
  Spin,
  message,
  Image,
  Breadcrumb,
  Descriptions,
} from "antd";
import {
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import Link from "next/link";

const { Title, Text, Paragraph } = Typography;

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images); } catch { return []; }
  }
  return [];
}

interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  status: string;
  salesCount: number;
  images: string[] | string;
  createdAt: string;
  category: { id: number; name: string };
  merchant: { shopName: string };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(0);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setProduct(json.data);
        }
        setLoading(false);
      });
  }, [params.id]);

  const addToCart = async () => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product?.id, quantity }),
    });

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    const json = await res.json();
    if (res.ok) {
      message.success("已加入购物车");
    } else {
      message.error(json.message || "操作失败");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Title level={4}>商品不存在</Title>
        <Link href="/products">返回商品列表</Link>
      </div>
    );
  }

  const formatPrice = (price: string | number) => `¥${Number(price).toFixed(2)}`;
  const images = parseImages(product.images);
  const isOnSale = product.status === "ON_SALE" && product.stock > 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 24 }}
        items={[
          { title: <Link href="/">首页</Link> },
          { title: <Link href="/products">商品列表</Link> },
          { title: product.category.name },
          { title: product.name },
        ]}
      />

      <Row gutter={[32, 24]}>
        {/* Images */}
        <Col xs={24} md={10}>
          <Image.PreviewGroup>
            <Image
              src={(images)?.[mainImage] || "https://picsum.photos/400/400"}
              alt={product.name}
              style={{ width: "100%", borderRadius: 8 }}
            />
          </Image.PreviewGroup>
          {(images).length > 1 && (
            <Row gutter={8} style={{ marginTop: 8 }}>
              {(images).map((img, idx) => (
                <Col key={idx} span={6}>
                  <img
                    src={img}
                    alt=""
                    onClick={() => setMainImage(idx)}
                    style={{
                      width: "100%",
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 4,
                      cursor: "pointer",
                      border:
                        idx === mainImage
                          ? "2px solid #1677ff"
                          : "2px solid transparent",
                    }}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Col>

        {/* Info */}
        <Col xs={24} md={14}>
          <Title level={3}>{product.name}</Title>
          <Tag color="blue">{product.category.name}</Tag>
          <Text type="secondary" style={{ marginLeft: 16 }}>
            {product.merchant.shopName}
          </Text>

          <div style={{ margin: "16px 0", background: "#fff5f5", padding: 16, borderRadius: 8 }}>
            <Text style={{ color: "#e00", fontSize: 28, fontWeight: "bold" }}>
              {formatPrice(product.price)}
            </Text>
            <Text type="secondary" style={{ marginLeft: 16 }}>
              已售 {product.salesCount} 件
            </Text>
          </div>

          <Paragraph style={{ color: "#666", marginBottom: 24 }}>
            {product.description}
          </Paragraph>

          <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="库存">
              {product.stock > 0 ? (
                <Text type="success">{product.stock} 件</Text>
              ) : (
                <Tag color="red">暂时缺货</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="上架时间">
              {new Date(product.createdAt).toLocaleDateString("zh-CN")}
            </Descriptions.Item>
          </Descriptions>

          {isOnSale && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <InputNumber
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(v) => setQuantity(v || 1)}
              />
              <Button
                type="primary"
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={addToCart}
              >
                加入购物车
              </Button>
              <Button size="large" icon={<ThunderboltOutlined />}>
                立即购买
              </Button>
            </div>
          )}
          {!isOnSale && (
            <Button size="large" disabled block>
              暂不可购买
            </Button>
          )}
        </Col>
      </Row>
    </div>
  );
}
