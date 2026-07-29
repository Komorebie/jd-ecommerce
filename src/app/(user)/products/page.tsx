"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Input,
  Select,
  Slider,
  Card,
  Row,
  Col,
  Pagination,
  Tag,
  Typography,
  Empty,
  Spin,
  Space,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Text } = Typography;
const { Meta } = Card;

interface Product {
  id: number;
  name: string;
  price: string;
  images: string[];
  salesCount: number;
  stock: number;
  category: { name: string };
}

interface Category {
  id: number;
  name: string;
  children: { id: number; name: string }[];
}

function ProductList() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [categoryId, setCategoryId] = useState<number | undefined>(
    searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
  );
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => setCategories(json.data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (categoryId) params.set("categoryId", String(categoryId));
    if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]));
    if (priceRange[1] < 20000) params.set("maxPrice", String(priceRange[1]));
    params.set("page", String(page));
    params.set("pageSize", "12");
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortBy === "price" ? "asc" : "desc");

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setProducts(json.data.list);
          setTotal(json.data.total);
        }
        setLoading(false);
      });
  }, [keyword, categoryId, priceRange, page, sortBy]);

  const formatPrice = (price: number | string) => `¥${Number(price).toFixed(2)}`;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      {/* Search & Filters */}
      <div style={{ background: "#fff", padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input.Search
              placeholder="搜索商品名称"
              allowClear
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              onSearch={() => setPage(1)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: "100%" }}
              value={categoryId}
              onChange={(v) => { setCategoryId(v); setPage(1); }}
              options={categories.flatMap((c) => [
                { label: c.name, value: c.id },
                ...c.children.map((sub) => ({
                  label: `  ${sub.name}`,
                  value: sub.id,
                })),
              ])}
            />
          </Col>
          <Col xs={24} md={6}>
            <Space>
              <Text type="secondary">价格</Text>
              <Slider
                range
                min={0}
                max={20000}
                step={500}
                value={priceRange}
                onChange={(v) => setPriceRange(v as number[])}
                onAfterChange={() => setPage(1)}
                style={{ width: 150 }}
                tooltip={{ formatter: (v) => formatPrice(v as number) }}
              />
            </Space>
          </Col>
          <Col xs={24} md={4}>
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: "100%" }}
              options={[
                { label: "最新", value: "createdAt" },
                { label: "价格从低到高", value: "price" },
                { label: "销量最高", value: "salesCount" },
              ]}
            />
          </Col>
        </Row>
      </div>

      {/* Product Grid */}
      <Spin spinning={loading}>
        {products.length === 0 ? (
          <Empty description="暂无商品" style={{ padding: 80 }} />
        ) : (
          <Row gutter={[16, 16]}>
            {products.map((p) => (
              <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
                <Link href={`/products/${p.id}`}>
                  <Card
                    hoverable
                    cover={
                      <img
                        alt={p.name}
                        src={(p.images as string[])?.[0] || "https://picsum.photos/400/400"}
                        style={{ height: 200, objectFit: "cover" }}
                      />
                    }
                    actions={[
                      <Text type="secondary" key="sales">
                        已售 {p.salesCount}
                      </Text>,
                      p.stock === 0 ? (
                        <Tag color="red" key="stock">缺货</Tag>
                      ) : null,
                    ].filter(Boolean)}
                  >
                    <Meta
                      title={
                        <Text ellipsis style={{ maxWidth: "100%" }}>
                          {p.name}
                        </Text>
                      }
                      description={
                        <div>
                          <Text strong style={{ color: "#e00", fontSize: 16 }}>
                            {formatPrice(p.price)}
                          </Text>
                          <br />
                          <Text type="secondary">{p.category.name}</Text>
                        </div>
                      }
                    />
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {/* Pagination */}
      {total > 12 && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={12}
            onChange={setPage}
            showSizeChanger={false}
            showTotal={(t) => `共 ${t} 件商品`}
          />
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Spin style={{ display: "block", padding: 80 }} />}>
      <ProductList />
    </Suspense>
  );
}
