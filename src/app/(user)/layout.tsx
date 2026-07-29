import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "仿京东电商平台",
  description: "多角色电商平台 — 用户端",
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
