// 订单列表页：状态筛选 + 订单卡片

import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ScrollView, RefreshControl, ActivityIndicator,
} from "react-native";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";
import type { Order } from "../types";
import { ORDER_STATUS_MAP, formatPrice } from "../types";

// 筛选标签：全部 + 常用状态
const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "全部" },
  { key: "PENDING_PAYMENT", label: "待支付" },
  { key: "PENDING_SHIPMENT", label: "待发货" },
  { key: "SHIPPED", label: "已发货" },
  { key: "REFUNDING", label: "退款中" },
  { key: "COMPLETED", label: "已完成" },
];

export default function OrdersScreen() {
  const { navigate } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 拉取全部订单（客户端按状态筛选）
  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const json = await api<Order[]>("/api/orders");
    if (json.code === 0 && json.data) {
      setOrders(json.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 状态筛选条 */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 订单列表 */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ fontSize: 40 }}>📦</Text>
            <Text style={{ color: "#999", marginTop: 10 }}>暂无订单</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = ORDER_STATUS_MAP[item.status] ?? { label: item.status, color: "#999" };
          return (
            <TouchableOpacity
              style={styles.orderCard}
              activeOpacity={0.8}
              onPress={() => navigate("orderDetail", { orderId: item.id })}
            >
              {/* 头部：订单号 + 状态 */}
              <View style={styles.cardHeader}>
                <Text style={styles.orderNo}>{item.orderNo}</Text>
                <Text style={[styles.statusTag, { color: st.color }]}>{st.label}</Text>
              </View>
              {/* 商品摘要 */}
              <View style={styles.cardBody}>
                <Image
                  source={{ uri: item.items?.[0]?.productImage || "https://picsum.photos/60/60" }}
                  style={styles.itemImage}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.items?.[0]?.productName ?? ""}
                  </Text>
                  <Text style={styles.itemCount}>
                    共 {item.items?.reduce((s, i) => s + i.quantity, 0) ?? 0} 件
                    {item.items && item.items.length > 1 ? ` · ${item.items.length} 种商品` : ""}
                  </Text>
                </View>
                <Text style={styles.totalAmount}>{formatPrice(item.totalAmount)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  filterBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterChipActive: { borderBottomColor: THEME_COLOR },
  filterText: { fontSize: 13, color: "#666" },
  filterTextActive: { color: THEME_COLOR, fontWeight: "bold" },
  orderCard: {
    backgroundColor: "#fff",
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 8,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderNo: { fontSize: 12, color: "#999" },
  statusTag: { fontSize: 13, fontWeight: "bold" },
  cardBody: { flexDirection: "row", alignItems: "center" },
  itemImage: { width: 56, height: 56, borderRadius: 6, backgroundColor: "#f5f5f5" },
  itemName: { fontSize: 13, color: "#333" },
  itemCount: { fontSize: 12, color: "#999", marginTop: 4 },
  totalAmount: { fontSize: 15, color: THEME_COLOR, fontWeight: "bold" },
});
