// 统一 API 请求封装：自动附加 NextAuth 会话 Cookie，统一解析响应格式

import { API_BASE_URL } from "../config";

/** 后端统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

// 会话 Cookie（登录成功后由 auth.login 写入，内存保存，重启应用需重新登录）
let sessionCookie = "";
// 未登录回调（由 AppContext 注册，接口返回 1002 时触发跳回登录页）
let unauthorizedHandler: (() => void) | null = null;

export function setSessionCookie(cookie: string) {
  sessionCookie = cookie;
}

export function clearSessionCookie() {
  sessionCookie = "";
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/**
 * 统一请求方法
 * @param path  接口路径，如 /api/products
 * @param options method 与 body
 * @returns 统一响应结构；网络异常时返回 code 3001
 */
export async function api<T = unknown>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: options?.method ?? "GET",
      headers: {
        ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}),
        // React Native 不自动维护 Cookie，需要手动携带 NextAuth 会话
        ...(sessionCookie ? { Cookie: `next-auth.session-token=${sessionCookie}` } : {}),
      },
      ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });

    const json = (await res.json()) as ApiResponse<T>;

    // 会话过期：通知上下文跳回登录页
    if (json.code === 1002 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return json;
  } catch {
    return { code: 3001, message: "网络错误，请确认后端服务已启动", data: null };
  }
}
