import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理员后台",
  description: "仿京东电商平台 — 平台管理端",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
