// 购物车页：勾选商品、修改数量、删除、合计结算

import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, Alert,
} from "react-native";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";
import type { CartItem } from "../types";
import { formatPrice } from "../types";

export default function CartScreen() {
  const { navigate, cartVersion, bumpCart } = useApp();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // 拉取购物车（依赖 cartVersion 在加购/结算后自动刷新）
  useEffect(() => {
    setLoading(true);
    api<CartItem[]>("/api/cart").then((json) => {
      if (json.code === 0 && json.data) {
        setItems(json.data);
      }
      setLoading(false);
    });
  }, [cartVersion]);

  // 勾选/取消勾选
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 修改数量
  const changeQuantity = async (item: CartItem, delta: number) => {
    const next = item.quantity + delta;
    if (next < 1) return;
    if (next > item.stock) {
      Alert.alert("提示", "超过库存上限");
      return;
    }
    const json = await api(`/api/cart/${item.id}`, {
      method: "PUT",
      body: { quantity: next },
    });
    if (json.code === 0) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)));
    } else {
      Alert.alert("提示", json.message);
    }
  };

  // 删除购物车项
  const removeItem = (item: CartItem) => {
    Alert.alert("移出购物车", `确定移除「${item.productName}」？`, [
      { text: "取消", style: "cancel" },
      {
        text: "移除",
        style: "destructive",
        onPress: async () => {
          const json = await api(`/api/cart/${item.id}`, { method: "DELETE" });
          if (json.code === 0) {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            setSelected((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
            bumpCart();
          } else {
            Alert.alert("提示", json.message);
          }
        },
      },
    ]);
  };

  // 已勾选商品
  const selectedItems = items.filter((i) => selected.has(i.id));
  const total = selectedItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  // 去结算
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert("提示", "请先勾选要结算的商品");
      return;
    }
    navigate("checkout", { cartItemIds: selectedItems.map((i) => i.id) });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>🛒</Text>
        <Text style={{ color: "#999", marginTop: 10 }}>购物车还是空的</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const checked = selected.has(item.id);
          return (
            <View style={styles.itemRow}>
              {/* 勾选框 */}
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item.id)}>
                <Text style={[styles.checkboxText, checked && styles.checkboxTextActive]}>
                  {checked ? "☑" : "☐"}
                </Text>
              </TouchableOpacity>

              {/* 商品图 */}
              <Image
                source={{ uri: item.productImage || "https://picsum.photos/80/80" }}
                style={styles.itemImage}
              />

              {/* 名称与数量 */}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => changeQuantity(item, -1)}
                  >
                    <Text style={styles.stepButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => changeQuantity(item, 1)}
                  >
                    <Text style={styles.stepButtonText}>＋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(item)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>删除</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 单价 */}
              <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
            </View>
          );
        }}
      />

      {/* 底部结算栏 */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>
            已选 {selectedItems.length} 件，合计：
          </Text>
          <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <Text style={styles.checkoutButtonText}>去结算</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 8,
    padding: 10,
  },
  checkbox: { padding: 4 },
  checkboxText: { fontSize: 22, color: "#ccc" },
  checkboxTextActive: { color: THEME_COLOR },
  itemImage: { width: 72, height: 72, borderRadius: 6, backgroundColor: "#f5f5f5" },
  itemInfo: { flex: 1, marginLeft: 10 },
  itemName: { fontSize: 13, color: "#333", height: 38 },
  stepper: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  stepButton: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  stepButtonText: { fontSize: 15, color: "#333" },
  quantity: { width: 34, textAlign: "center", fontSize: 14, color: "#333" },
  deleteButton: { marginLeft: 12 },
  deleteButtonText: { fontSize: 12, color: "#999" },
  itemPrice: { fontSize: 14, color: THEME_COLOR, fontWeight: "bold", marginLeft: 8 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: { fontSize: 12, color: "#666" },
  totalAmount: { fontSize: 18, color: THEME_COLOR, fontWeight: "bold" },
  checkoutButton: {
    backgroundColor: THEME_COLOR,
    borderRadius: 21,
    paddingHorizontal: 30,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
