// 登录认证：适配 NextAuth v4 凭据登录流程（CSRF 校验 + 会话 Cookie 捕获）
// React Native 不自动维护 Cookie，需要手动完成三步流程

import { API_BASE_URL } from "../config";
import { setSessionCookie, clearSessionCookie } from "./client";
import type { SessionUser } from "../types";

/**
 * 从 set-cookie 响应头中提取指定名称的 Cookie 值
 * set-cookie 可能包含多个 Cookie（逗号分隔），按名称正则提取避免误拆
 */
function extractCookie(setCookie: string, name: string): string {
  const match = setCookie.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
  return match ? match[1] : "";
}

/** 登录结果 */
export interface LoginResult {
  ok: boolean;
  message: string;
  user?: SessionUser;
}

/**
 * 登录流程（三步）：
 * 1. GET /api/auth/csrf 获取 CSRF Token 和 csrf Cookie
 * 2. POST /api/auth/callback/credentials 提交凭据（携带 csrf Token 和 Cookie）
 * 3. 从响应头捕获 next-auth.session-token 会话 Cookie，后续请求手动携带
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    // 第一步：获取 CSRF Token
    const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf`);
    if (!csrfRes.ok) {
      return { ok: false, message: "无法连接服务器，请确认后端已启动" };
    }
    const csrfData = (await csrfRes.json()) as { csrfToken?: string };
    if (!csrfData.csrfToken) {
      return { ok: false, message: "获取安全令牌失败" };
    }
    const csrfCookie = extractCookie(csrfRes.headers.get("set-cookie") ?? "", "next-auth.csrf-token");

    // 第二步：提交凭据（form 编码）
    const form = new URLSearchParams();
    form.append("csrfToken", csrfData.csrfToken);
    form.append("email", email);
    form.append("password", password);
    form.append("callbackUrl", API_BASE_URL);
    form.append("json", "true");

    const loginRes = await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(csrfCookie ? { Cookie: `next-auth.csrf-token=${csrfCookie}` } : {}),
      },
      body: form.toString(),
    });

    const result = (await loginRes.json().catch(() => null)) as { url?: string } | null;
    // 登录失败时 NextAuth 返回的 url 中包含 error 参数
    if (!result || (result.url && result.url.includes("error="))) {
      return { ok: false, message: "邮箱或密码错误" };
    }

    // 第三步：捕获会话 Cookie
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const session = extractCookie(setCookie, "next-auth.session-token");
    if (!session) {
      return { ok: false, message: "登录失败：未获取到会话凭证" };
    }
    setSessionCookie(session);

    // 拉取当前用户信息（含角色）
    const sessionRes = await fetch(`${API_BASE_URL}/api/auth/session`, {
      headers: { Cookie: `next-auth.session-token=${session}` },
    });
    const sessionData = (await sessionRes.json()) as {
      user?: { name?: string | null; email?: string | null; role?: string | null };
    };
    const u = sessionData.user;
    if (!u?.email) {
      clearSessionCookie();
      return { ok: false, message: "获取用户信息失败" };
    }

    return {
      ok: true,
      message: "登录成功",
      user: {
        name: u.name ?? u.email,
        email: u.email,
        role: (u.role as SessionUser["role"]) ?? "USER",
      },
    };
  } catch {
    return { ok: false, message: "网络错误，请稍后重试" };
  }
}

/** 退出登录：清除本地会话（简化处理，App 重启后需重新登录） */
export async function logout(): Promise<void> {
  clearSessionCookie();
}
