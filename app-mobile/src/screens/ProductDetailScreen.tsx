// 商品详情页：图片/价格/库存/描述 + 加购/立即购买

import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";
import type { Product, CartItem } from "../types";
import { formatPrice } from "../types";

interface Props {
  productId: number;
}

export default function ProductDetailScreen({ productId }: Props) {
  const { goBack, navigate, bumpCart } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  // 拉取商品详情
  useEffect(() => {
    api<Product>(`/api/products/${productId}`).then((json) => {
      if (json.code === 0 && json.data) setProduct(json.data);
      setLoading(false);
    });
  }, [productId]);

  // 加入购物车（返回新购物车项，供立即购买跳结算）
  const addToCart = async (): Promise<CartItem | null> => {
    const json = await api<CartItem>("/api/cart", {
      method: "POST",
      body: { productId, quantity },
    });
    if (json.code !== 0) {
      Alert.alert("提示", json.message);
      return null;
    }
    bumpCart();
    return json.data;
  };

  // 仅加入购物车
  const handleAddToCart = async () => {
    await addToCart();
    if (product) Alert.alert("已加入购物车", product.name);
  };

  // 立即购买：加购后直接进入结算页
  const handleBuyNow = async () => {
    const item = await addToCart();
    if (item) {
      navigate("checkout", { cartItemIds: [item.id] });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#999" }}>商品不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* 商品主图 */}
        <Image
          source={{ uri: product.images?.[0] || "https://picsum.photos/400/400" }}
          style={styles.image}
        />

        <View style={styles.section}>
          {/* 价格区 */}
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>销量 {product.salesCount}</Text>
            <Text style={styles.meta}>
              库存 {product.stock > 0 ? `${product.stock} 件` : "缺货"}
            </Text>
            {product.merchant?.shopName && (
              <Text style={styles.meta}>店铺：{product.merchant.shopName}</Text>
            )}
          </View>
        </View>

        {/* 商品描述 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商品介绍</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* 数量选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>购买数量</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text style={styles.stepButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            >
              <Text style={styles.stepButtonText}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.cartButton]}
          onPress={handleAddToCart}
          disabled={product.stock === 0}
        >
          <Text style={styles.cartButtonText}>加入购物车</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.buyButton]}
          onPress={handleBuyNow}
          disabled={product.stock === 0}
        >
          <Text style={styles.buyButtonText}>立即购买</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: 320, backgroundColor: "#eee" },
  section: { backgroundColor: "#fff", marginTop: 10, padding: 14 },
  price: { fontSize: 24, color: THEME_COLOR, fontWeight: "bold" },
  name: { fontSize: 16, color: "#333", marginTop: 6, lineHeight: 24 },
  metaRow: { flexDirection: "row", marginTop: 8, gap: 14, flexWrap: "wrap" },
  meta: { fontSize: 12, color: "#999" },
  sectionTitle: { fontSize: 14, color: "#666", fontWeight: "bold", marginBottom: 8 },
  description: { fontSize: 13, color: "#555", lineHeight: 22 },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  stepButtonText: { fontSize: 18, color: "#333" },
  quantity: { width: 50, textAlign: "center", fontSize: 16, color: "#333" },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  backButton: {
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { color: "#666", fontSize: 14 },
  actionButton: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cartButton: { backgroundColor: "#fff0d9" },
  cartButtonText: { color: "#c46b00", fontSize: 14, fontWeight: "bold" },
  buyButton: { backgroundColor: THEME_COLOR },
  buyButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
