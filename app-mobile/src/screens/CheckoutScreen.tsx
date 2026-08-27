// 结算页：选择收货地址（支持新增）、填写备注、提交订单并模拟支付

import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal,
} from "react-native";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";
import type { Address, Order } from "../types";
import { formatPrice } from "../types";

interface Props {
  cartItemIds: number[];
}

// 新增地址表单数据
interface NewAddress {
  receiver: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
}

export default function CheckoutScreen({ cartItemIds }: Props) {
  const { goBack, resetToMain, bumpCart } = useApp();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // 新增地址弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState<NewAddress>({
    receiver: "", phone: "", province: "", city: "", district: "", detail: "",
  });

  // 拉取收货地址
  useEffect(() => {
    api<Address[]>("/api/addresses").then((json) => {
      if (json.code === 0 && json.data) {
        setAddresses(json.data);
        const def = json.data.find((a) => a.isDefault) ?? json.data[0];
        if (def) setAddressId(def.id);
      }
      setLoading(false);
    });
  }, []);

  // 保存新增地址
  const saveAddress = async () => {
    const a = newAddress;
    if (!a.receiver || !a.phone || !a.province || !a.city || !a.district || !a.detail) {
      Alert.alert("提示", "请完整填写收货地址");
      return;
    }
    const json = await api<Address>("/api/addresses", {
      method: "POST",
      body: { ...a, isDefault: addresses.length === 0 },
    });
    if (json.code === 0 && json.data) {
      setAddresses((prev) => [...prev, json.data as Address]);
      setAddressId(json.data.id);
      setModalVisible(false);
      setNewAddress({ receiver: "", phone: "", province: "", city: "", district: "", detail: "" });
      Alert.alert("成功", "地址已添加");
    } else {
      Alert.alert("提示", json.message);
    }
  };

  // 提交订单 + 模拟支付
  const handleSubmit = async () => {
    if (!addressId) {
      Alert.alert("提示", "请选择收货地址");
      return;
    }
    setSubmitting(true);
    // 第一步：创建订单
    const createJson = await api<Order[]>("/api/orders", {
      method: "POST",
      body: { addressId, cartItemIds, remark: remark || undefined },
    });
    if (createJson.code !== 0 || !createJson.data) {
      setSubmitting(false);
      Alert.alert("下单失败", createJson.message);
      return;
    }
    // 第二步：模拟支付（对每笔订单执行支付）
    const orders = createJson.data;
    for (const order of orders) {
      await api(`/api/orders/${order.id}`, { method: "PUT", body: { action: "pay" } });
    }
    setSubmitting(false);
    bumpCart();
    Alert.alert("下单成功", "已模拟支付，订单状态变更为待发货", [
      { text: "查看订单", onPress: () => resetToMain() },
    ]);
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
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
        {/* 地址选择 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>收货地址</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.linkText}>+ 新增地址</Text>
            </TouchableOpacity>
          </View>
          {addresses.length === 0 ? (
            <Text style={styles.emptyText}>暂无地址，请点击右上角新增</Text>
          ) : (
            addresses.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.addressCard, addressId === a.id && styles.addressCardActive]}
                onPress={() => setAddressId(a.id)}
              >
                <Text style={[styles.radioText, addressId === a.id && styles.radioTextActive]}>
                  {addressId === a.id ? "◉" : "○"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressReceiver}>
                    {a.receiver}  {a.phone}
                    {a.isDefault && <Text style={styles.defaultTag}> 默认</Text>}
                  </Text>
                  <Text style={styles.addressDetail}>
                    {a.province}{a.city}{a.district} {a.detail}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 备注 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>订单备注</Text>
          <TextInput
            style={styles.remarkInput}
            placeholder="给商家留言（选填）"
            placeholderTextColor="#bbb"
            value={remark}
            onChangeText={setRemark}
          />
        </View>
      </ScrollView>

      {/* 底部提交栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>提交订单并支付（模拟）</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 新增地址弹窗 */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>新增收货地址</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="收件人姓名"
              placeholderTextColor="#bbb"
              value={newAddress.receiver}
              onChangeText={(v) => setNewAddress({ ...newAddress, receiver: v })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="手机号"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
              value={newAddress.phone}
              onChangeText={(v) => setNewAddress({ ...newAddress, phone: v })}
            />
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="省"
                placeholderTextColor="#bbb"
                value={newAddress.province}
                onChangeText={(v) => setNewAddress({ ...newAddress, province: v })}
              />
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="市"
                placeholderTextColor="#bbb"
                value={newAddress.city}
                onChangeText={(v) => setNewAddress({ ...newAddress, city: v })}
              />
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="区/县"
                placeholderTextColor="#bbb"
                value={newAddress.district}
                onChangeText={(v) => setNewAddress({ ...newAddress, district: v })}
              />
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="详细地址"
              placeholderTextColor="#bbb"
              value={newAddress.detail}
              onChangeText={(v) => setNewAddress({ ...newAddress, detail: v })}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveAddress}>
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { backgroundColor: "#fff", marginTop: 10, padding: 14 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, color: "#333", fontWeight: "bold" },
  linkText: { fontSize: 13, color: THEME_COLOR },
  emptyText: { fontSize: 13, color: "#999" },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  addressCardActive: { borderColor: THEME_COLOR, backgroundColor: "#fff7f7" },
  radioText: { fontSize: 18, color: "#ccc", marginRight: 8 },
  radioTextActive: { color: THEME_COLOR },
  addressReceiver: { fontSize: 14, color: "#333", fontWeight: "bold" },
  defaultTag: { fontSize: 11, color: THEME_COLOR },
  addressDetail: { fontSize: 12, color: "#666", marginTop: 4, lineHeight: 18 },
  remarkInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#333",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitButton: {
    backgroundColor: THEME_COLOR,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  modalMask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
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
  modalRow: { flexDirection: "row", gap: 8 },
  modalButtons: { flexDirection: "row", marginTop: 6, gap: 10 },
  modalCancel: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { color: "#666", fontSize: 14 },
  modalSave: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
