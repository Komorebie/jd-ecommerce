// 全局应用上下文：会话状态 + 极简页面栈导航（避免引入额外导航库）

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { SessionUser } from "../types";
import { setUnauthorizedHandler } from "../api/client";
import { login as doLogin, logout as doLogout } from "../api/auth";

/** 页面定义 */
export interface Screen {
  name: string;
  params?: Record<string, unknown>;
}

interface AppContextValue {
  /** 当前登录用户（null 表示未登录） */
  user: SessionUser | null;
  /** 页面栈（最后一个元素是当前页面） */
  screens: Screen[];
  /** 购物车版本号：结算成功后 +1，购物车页据此刷新 */
  cartVersion: number;
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  navigate: (name: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  resetToMain: () => void;
  bumpCart: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [screens, setScreens] = useState<Screen[]>([{ name: "login" }]);
  const [cartVersion, setCartVersion] = useState(0);

  // 未登录状态：会话失效或未登录时回到登录页
  const resetToLogin = useCallback(() => {
    setUser(null);
    setScreens([{ name: "login" }]);
  }, []);

  // 注册未登录回调：接口返回 1002 时自动跳回登录页
  useEffect(() => {
    setUnauthorizedHandler(resetToLogin);
    return () => setUnauthorizedHandler(null);
  }, [resetToLogin]);

  // 登录成功：进入主界面（底部四个标签页）
  const login = async (email: string, password: string) => {
    const result = await doLogin(email, password);
    if (result.ok && result.user) {
      setUser(result.user);
      setScreens([{ name: "main" }]);
    }
    return { ok: result.ok, message: result.message };
  };

  // 退出登录：清除会话回到登录页
  const logout = async () => {
    await doLogout();
    resetToLogin();
  };

  // 压栈进入新页面
  const navigate = useCallback((name: string, params?: Record<string, unknown>) => {
    setScreens((prev) => [...prev, { name, params }]);
  }, []);

  // 返回上一页
  const goBack = useCallback(() => {
    setScreens((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // 重置到主界面（结算成功后回到购物车所在的主界面）
  const resetToMain = useCallback(() => {
    setScreens([{ name: "main" }]);
  }, []);

  // 购物车数据变化通知
  const bumpCart = useCallback(() => {
    setCartVersion((v) => v + 1);
  }, []);

  return (
    <AppContext.Provider
      value={{ user, screens, cartVersion, login, logout, navigate, goBack, resetToMain, bumpCart }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp 必须在 AppProvider 内使用");
  return ctx;
}
