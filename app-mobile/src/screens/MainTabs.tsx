// 主界面：底部四标签导航（首页/购物车/订单/我的）

import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { THEME_COLOR } from "../config";
import HomeScreen from "./HomeScreen";
import CartScreen from "./CartScreen";
import OrdersScreen from "./OrdersScreen";
import ProfileScreen from "./ProfileScreen";

const TABS = [
  { key: "home", label: "首页", icon: "🏠" },
  { key: "cart", label: "购物车", icon: "🛒" },
  { key: "orders", label: "订单", icon: "📦" },
  { key: "profile", label: "我的", icon: "👤" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MainTabs() {
  const [tab, setTab] = useState<TabKey>("home");

  return (
    <View style={styles.container}>
      {/* 内容区 */}
      <View style={styles.content}>
        {tab === "home" && <HomeScreen />}
        {tab === "cart" && <CartScreen />}
        {tab === "orders" && <OrdersScreen />}
        {tab === "profile" && <ProfileScreen />}
      </View>

      {/* 底部标签栏 */}
      <View style={styles.tabBar}>
        {TABS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.tabItem}
            onPress={() => setTab(item.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{item.icon}</Text>
            <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 6,
    paddingBottom: 10,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: "#999", marginTop: 2 },
  tabLabelActive: { color: THEME_COLOR, fontWeight: "bold" },
});
