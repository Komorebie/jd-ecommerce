// 登录页：邮箱密码登录（走 NextAuth 凭据登录）

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useApp } from "../context/AppContext";
import { THEME_COLOR } from "../config";

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 提交登录
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("提示", "请输入邮箱和密码");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      Alert.alert("登录失败", result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>🛍️</Text>
        <Text style={styles.title}>仿京东商城 APP</Text>
        <Text style={styles.subtitle}>登录后即可购物、下单、跟踪退款</Text>

        <TextInput
          style={styles.input}
          placeholder="邮箱"
          placeholderTextColor="#bbb"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="密码"
          placeholderTextColor="#bbb"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>登 录</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          测试账号：user1@test.com / 123456{`\n`}
          （商家 merchant@test.com、管理员 admin@test.com 请在网页端登录）
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLOR, justifyContent: "center" },
  card: {
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "bold", color: "#333" },
  subtitle: { fontSize: 13, color: "#999", marginTop: 6, marginBottom: 20 },
  input: {
    width: "100%",
    height: 46,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
    color: "#333",
  },
  button: {
    width: "100%",
    height: 46,
    backgroundColor: THEME_COLOR,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  hint: { fontSize: 12, color: "#aaa", marginTop: 16, textAlign: "center", lineHeight: 18 },
});
