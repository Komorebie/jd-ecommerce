// 个人中心页：账号信息展示 + 退出登录

import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";

// 角色中文映射
const ROLE_LABELS: Record<string, string> = {
  USER: "普通用户",
  MERCHANT: "商家",
  ADMIN: "管理员",
};

export default function ProfileScreen() {
  const { user, logout } = useApp();

  // 确认退出
  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出当前账号吗？", [
      { text: "取消", style: "cancel" },
      { text: "退出", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 用户信息卡 */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? "用").slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "未登录"}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{ROLE_LABELS[user?.role ?? "USER"] ?? "普通用户"}</Text>
        </View>
      </View>

      {/* 功能说明 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>APP 支持的功能</Text>
        <Text style={styles.cardItem}>· 商品浏览 / 搜索 / 分类筛选</Text>
        <Text style={styles.cardItem}>· 购物车与下单（模拟支付）</Text>
        <Text style={styles.cardItem}>· 订单管理（支付/取消/确认收货/删除）</Text>
        <Text style={styles.cardItem}>· 退款全流程（申请/撤销/寄回/申诉）</Text>
        <Text style={styles.cardItem}>· 收货地址管理</Text>
      </View>

      {/* 退出登录 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutButtonText}>退出登录</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", backgroundColor: THEME_COLOR, paddingVertical: 30 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 26, color: "#fff", fontWeight: "bold" },
  name: { fontSize: 18, color: "#fff", fontWeight: "bold", marginTop: 10 },
  email: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  roleTag: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleTagText: { fontSize: 12, color: "#fff" },
  card: { backgroundColor: "#fff", margin: 12, borderRadius: 8, padding: 16 },
  cardTitle: { fontSize: 14, color: "#333", fontWeight: "bold", marginBottom: 10 },
  cardItem: { fontSize: 13, color: "#666", lineHeight: 26 },
  logoutButton: {
    margin: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: { color: THEME_COLOR, fontSize: 15, fontWeight: "bold" },
});
