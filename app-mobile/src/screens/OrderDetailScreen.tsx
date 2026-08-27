// 订单详情页：订单信息 + 状态操作（支付/取消/确认收货/删除）+ 退款全流程操作

import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, ActivityIndicator, Alert, Modal, TextInput, RefreshControl,
} from "react-native";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";
import type { Order, Refund } from "../types";
import { ORDER_STATUS_MAP, REFUND_STATUS_MAP, formatPrice } from "../types";

interface Props {
  orderId: number;
}

export default function OrderDetailScreen({ orderId }: Props) {
  const { goBack } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // 申请退款弹窗
  const [refundModal, setRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  // 申诉弹窗
  const [appealModal, setAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState("");

  // 拉取订单详情（含退款记录）
  const fetchOrder = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const json = await api<Order>(`/api/orders/${orderId}`);
    if (json.code === 0 && json.data) setOrder(json.data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // 当前活跃退款（进行中的退款优先）
  const activeRefund: Refund | undefined =
    order?.refunds?.find((r) => ["PENDING", "APPROVED", "RETURNING", "APPEALING"].includes(r.status)) ??
    order?.refunds?.[0];

  // 订单基础操作（支付/取消/确认收货）
  const handleOrderAction = (action: string) => {
    if (!order) return;
    const actionName = action === "pay" ? "支付" : action === "cancel" ? "取消订单" : "确认收货";
    Alert.alert(actionName, `确定${actionName}吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        onPress: async () => {
          const json = await api(`/api/orders/${order.id}`, {
            method: "PUT",
            body: { action },
          });
          if (json.code === 0) {
            Alert.alert("成功", json.message);
            fetchOrder();
          } else {
            Alert.alert("提示", json.message);
          }
        },
      },
    ]);
  };

  // 删除订单（软删除，仅终态可删）
  const handleDeleteOrder = () => {
    if (!order) return;
    Alert.alert("删除订单", "删除后可在订单列表中隐藏该记录", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          const json = await api(`/api/orders/${order.id}`, { method: "DELETE" });
          if (json.code === 0) {
            Alert.alert("已删除", json.message, [{ text: "好的", onPress: goBack }]);
          } else {
            Alert.alert("提示", json.message);
          }
        },
      },
    ]);
  };

  // 提交退款申请
  const handleApplyRefund = async () => {
    if (!order) return;
    if (!refundReason.trim() || !refundAmount) {
      Alert.alert("提示", "请填写退款原因和金额");
      return;
    }
    const json = await api("/api/refunds", {
      method: "POST",
      body: { orderId: order.id, reason: refundReason.trim(), amount: Number(refundAmount) },
    });
    if (json.code === 0) {
      setRefundModal(false);
      Alert.alert("提交成功", json.message);
      fetchOrder();
    } else {
      Alert.alert("提示", json.message);
    }
  };

  // 退款操作：撤销 / 寄回
  const handleRefundAction = (action: "cancel" | "return") => {
    if (!activeRefund) return;
    const title = action === "cancel" ? "撤销退款申请" : "确认已寄回商品";
    const tips =
      action === "cancel"
        ? "撤销后订单将恢复原状态"
        : "确认后等待商家确认收货并完成退款";
    Alert.alert(title, tips, [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        onPress: async () => {
          const json = await api(`/api/refunds/${activeRefund.id}/${action}`, { method: "PUT" });
          if (json.code === 0) {
            Alert.alert("成功", json.message);
            fetchOrder();
          } else {
            Alert.alert("提示", json.message);
          }
        },
      },
    ]);
  };

  // 提交申诉
  const handleAppeal = async () => {
    if (!activeRefund) return;
    if (!appealReason.trim()) {
      Alert.alert("提示", "请填写申诉理由");
      return;
    }
    const json = await api(`/api/refunds/${activeRefund.id}/appeal`, {
      method: "PUT",
      body: { appealReason: appealReason.trim() },
    });
    if (json.code === 0) {
      setAppealModal(false);
      setAppealReason("");
      Alert.alert("提交成功", json.message);
      fetchOrder();
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

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#999" }}>订单不存在</Text>
      </View>
    );
  }

  const st = ORDER_STATUS_MAP[order.status] ?? { label: order.status, color: "#999" };
  const refundSt = activeRefund
    ? REFUND_STATUS_MAP[activeRefund.status] ?? { label: activeRefund.status, color: "#999" }
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrder(true)} />}
      >
        {/* 订单状态卡 */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.orderNo}>{order.orderNo}</Text>
            <Text style={[styles.statusTag, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={styles.metaText}>下单时间：{new Date(order.createdAt).toLocaleString("zh-CN")}</Text>
          <Text style={styles.metaText}>
            合计金额：<Text style={styles.totalText}>{formatPrice(order.totalAmount)}</Text>
          </Text>
        </View>

        {/* 退款进度卡 */}
        {activeRefund && refundSt && (
          <View style={[styles.section, styles.refundCard]}>
            <View style={styles.headerRow}>
              <Text style={styles.refundTitle}>退款进度</Text>
              <Text style={[styles.statusTag, { color: refundSt.color }]}>{refundSt.label}</Text>
            </View>
            <Text style={styles.metaText}>退款金额：{formatPrice(activeRefund.amount)}</Text>
            <Text style={styles.metaText}>退款原因：{activeRefund.reason}</Text>
            <Text style={styles.metaText}>
              申请时间：{new Date(activeRefund.appliedAt).toLocaleString("zh-CN")}
            </Text>
            {activeRefund.rejectReason && (
              <Text style={styles.metaText}>处理意见：{activeRefund.rejectReason}</Text>
            )}
            {activeRefund.appealReason && (
              <Text style={styles.metaText}>我的申诉：{activeRefund.appealReason}</Text>
            )}

            {/* 退款操作按钮 */}
            <View style={styles.buttonRow}>
              {activeRefund.status === "PENDING" && (
                <TouchableOpacity style={styles.outlineButton} onPress={() => handleRefundAction("cancel")}>
                  <Text style={styles.outlineButtonText}>撤销申请</Text>
                </TouchableOpacity>
              )}
              {activeRefund.status === "APPROVED" && (
                <TouchableOpacity style={styles.primaryButton} onPress={() => handleRefundAction("return")}>
                  <Text style={styles.primaryButtonText}>确认已寄回</Text>
                </TouchableOpacity>
              )}
              {activeRefund.status === "REJECTED" && (
                <TouchableOpacity style={styles.dangerButton} onPress={() => setAppealModal(true)}>
                  <Text style={styles.dangerButtonText}>向平台申诉</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* 状态提示 */}
            {activeRefund.status === "PENDING" && (
              <Text style={styles.hintText}>等待商家审核中，若 48 小时未处理可联系平台客服</Text>
            )}
            {activeRefund.status === "APPROVED" && (
              <Text style={styles.hintText}>商家已同意，请 7 天内寄回商品，逾期自动关闭</Text>
            )}
            {activeRefund.status === "RETURNING" && (
              <Text style={styles.hintText}>商品已寄回，等待商家确认收货后完成退款</Text>
            )}
            {activeRefund.status === "APPEALING" && (
              <Text style={styles.hintText}>申诉处理中，平台客服将尽快裁决</Text>
            )}
          </View>
        )}

        {/* 商品清单 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商品清单</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.goodsRow}>
              <Image
                source={{ uri: item.productImage || "https://picsum.photos/60/60" }}
                style={styles.goodsImage}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.goodsName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.goodsMeta}>
                  {formatPrice(item.price)} × {item.quantity}
                </Text>
              </View>
              <Text style={styles.goodsSubtotal}>
                {formatPrice(Number(item.price) * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* 收货信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>收货信息</Text>
          {order.address && (
            <>
              <Text style={styles.metaText}>
                {order.address.receiver}  {order.address.phone}
              </Text>
              <Text style={styles.metaText}>
                {order.address.province}{order.address.city}{order.address.district}{" "}
                {order.address.detail}
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* 底部操作栏（按订单状态动态显示） */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.outlineButton} onPress={goBack}>
          <Text style={styles.outlineButtonText}>返回</Text>
        </TouchableOpacity>

        {order.status === "PENDING_PAYMENT" && (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={() => handleOrderAction("pay")}>
              <Text style={styles.primaryButtonText}>去支付</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={() => handleOrderAction("cancel")}>
              <Text style={styles.outlineButtonText}>取消订单</Text>
            </TouchableOpacity>
          </>
        )}

        {order.status === "SHIPPED" && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => handleOrderAction("confirm")}>
            <Text style={styles.primaryButtonText}>确认收货</Text>
          </TouchableOpacity>
        )}

        {["PENDING_SHIPMENT", "SHIPPED", "COMPLETED"].includes(order.status) && !activeRefund && (
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              setRefundAmount(String(Number(order.totalAmount)));
              setRefundReason("");
              setRefundModal(true);
            }}
          >
            <Text style={styles.dangerButtonText}>申请退款</Text>
          </TouchableOpacity>
        )}

        {["CANCELLED", "COMPLETED", "REFUNDED"].includes(order.status) && (
          <TouchableOpacity style={styles.outlineButton} onPress={handleDeleteOrder}>
            <Text style={styles.outlineButtonText}>删除订单</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 申请退款弹窗 */}
      <Modal visible={refundModal} animationType="slide" transparent>
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>申请退款</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="退款金额"
              placeholderTextColor="#bbb"
              keyboardType="decimal-pad"
              value={refundAmount}
              onChangeText={setRefundAmount}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="请说明退款原因"
              placeholderTextColor="#bbb"
              multiline
              value={refundReason}
              onChangeText={setRefundReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRefundModal(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleApplyRefund}>
                <Text style={styles.modalSaveText}>提交申请</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 申诉弹窗 */}
      <Modal visible={appealModal} animationType="slide" transparent>
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>向平台申诉</Text>
            {activeRefund?.rejectReason && (
              <Text style={styles.metaText}>商家拒绝理由：{activeRefund.rejectReason}</Text>
            )}
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="请填写申诉理由，平台将据此裁决"
              placeholderTextColor="#bbb"
              multiline
              value={appealReason}
              onChangeText={setAppealReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAppealModal(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAppeal}>
                <Text style={styles.modalSaveText}>提交申诉</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { backgroundColor: "#fff", marginTop: 10, padding: 14 },
  refundCard: { backgroundColor: "#fffaf5" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  orderNo: { fontSize: 13, color: "#999" },
  statusTag: { fontSize: 15, fontWeight: "bold" },
  refundTitle: { fontSize: 15, fontWeight: "bold", color: "#333" },
  sectionTitle: { fontSize: 14, color: "#333", fontWeight: "bold", marginBottom: 8 },
  metaText: { fontSize: 12, color: "#666", marginBottom: 4, lineHeight: 18 },
  totalText: { fontSize: 15, color: THEME_COLOR, fontWeight: "bold" },
  hintText: { fontSize: 11, color: "#b8860b", marginTop: 8 },
  goodsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  goodsImage: { width: 56, height: 56, borderRadius: 6, backgroundColor: "#f5f5f5" },
  goodsName: { fontSize: 13, color: "#333" },
  goodsMeta: { fontSize: 12, color: "#999", marginTop: 4 },
  goodsSubtotal: { fontSize: 13, color: "#333", fontWeight: "bold" },
  buttonRow: { flexDirection: "row", marginTop: 10, gap: 10 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  outlineButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  outlineButtonText: { color: "#666", fontSize: 13 },
  primaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  dangerButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "#ffcccc",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: { color: "#c62828", fontSize: 13, fontWeight: "bold" },
  modalMask: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 14 },
  modalInput: {
    height: 42,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
    color: "#333",
  },
  modalTextArea: { height: 90, textAlignVertical: "top", paddingTop: 10 },
  modalButtons: { flexDirection: "row", marginTop: 6, gap: 10 },
  modalCancel: {
    flex: 1, height: 42, borderRadius: 21, borderWidth: 1, borderColor: "#ddd",
    alignItems: "center", justifyContent: "center",
  },
  modalCancelText: { color: "#666", fontSize: 14 },
  modalSave: {
    flex: 1, height: 42, borderRadius: 21, backgroundColor: THEME_COLOR,
    alignItems: "center", justifyContent: "center",
  },
  modalSaveText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
