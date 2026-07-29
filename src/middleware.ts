import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 已登录用户访问登录/注册/忘记密码页 → 重定向到各自首页
    if (token && (path === "/login" || path === "/register" || path === "/forgot-password")) {
      const role = token.role as string;
      if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      if (role === "MERCHANT") return NextResponse.redirect(new URL("/merchant/dashboard", req.url));
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 商家路由只允许 MERCHANT 角色
    if (path.startsWith("/merchant") && token?.role !== "MERCHANT" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 管理员路由只允许 ADMIN 角色
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // 公开页面无需登录
        if (path === "/login" || path === "/register" || path === "/forgot-password") return true;
        // 其他页面需要登录
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|globals.css).*)",
  ],
};
