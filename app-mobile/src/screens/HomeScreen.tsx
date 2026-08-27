// 首页：商品搜索 + 分类筛选 + 商品双列网格

import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ScrollView, RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";
import type { Product, Category } from "../types";
import { formatPrice } from "../types";

export default function HomeScreen() {
  const { navigate, bumpCart } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 拉取分类（仅二级分类）
  useEffect(() => {
    api<Category[]>("/api/categories").then((json) => {
      if (json.code === 0 && json.data) {
        setCategories(json.data.filter((c) => c.parentId));
      }
    });
  }, []);

  // 拉取商品列表
  const fetchProducts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (keyword) params.set("keyword", keyword);
    if (categoryId) params.set("categoryId", String(categoryId));
    const json = await api<{ list: Product[] }>(`/api/products?${params}`);
    if (json.code === 0 && json.data) {
      setProducts(json.data.list);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 加入购物车
  const handleAddToCart = async (product: Product) => {
    const json = await api("/api/cart", {
      method: "POST",
      body: { productId: product.id, quantity: 1 },
    });
    if (json.code === 0) {
      bumpCart();
      Alert.alert("已加入购物车", product.name);
    } else {
      Alert.alert("提示", json.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部搜索栏 */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索商品"
          placeholderTextColor="#bbb"
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => fetchProducts()}
        />
        <TouchableOpacity style={styles.searchButton} onPress={() => fetchProducts()}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* 分类筛选横向滚动条 */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.categoryChip, categoryId === null && styles.categoryChipActive]}
            onPress={() => { setCategoryId(null); setTimeout(() => fetchProducts(), 0); }}
          >
            <Text style={[styles.categoryChipText, categoryId === null && styles.categoryChipTextActive]}>
              全部
            </Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryChip, categoryId === c.id && styles.categoryChipActive]}
              onPress={() => { setCategoryId(c.id); setTimeout(() => fetchProducts(), 0); }}
            >
              <Text style={[styles.categoryChipText, categoryId === c.id && styles.categoryChipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 商品双列网格 */}
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: "#999" }}>暂无商品</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            activeOpacity={0.8}
            onPress={() => navigate("productDetail", { productId: item.id })}
          >
            <Image
              source={{ uri: item.images?.[0] || "https://picsum.photos/200/200" }}
              style={styles.productImage}
            />
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.productBottom}>
              <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToCart(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: "#fff",
    borderRadius: 19,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#333",
  },
  searchButton: { marginLeft: 10, paddingHorizontal: 6 },
  searchButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  categoryBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  categoryChipActive: { borderBottomColor: THEME_COLOR },
  categoryChipText: { fontSize: 14, color: "#666" },
  categoryChipTextActive: { color: THEME_COLOR, fontWeight: "bold" },
  row: { paddingHorizontal: 8, justifyContent: "space-between" },
  productCard: {
    flex: 1,
    maxWidth: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 4,
    padding: 10,
  },
  productImage: { width: "100%", height: 140, borderRadius: 6, backgroundColor: "#f5f5f5" },
  productName: { fontSize: 13, color: "#333", marginTop: 8, height: 38 },
  productBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  productPrice: { fontSize: 15, color: THEME_COLOR, fontWeight: "bold" },
  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", lineHeight: 18 },
});
