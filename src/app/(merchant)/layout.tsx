import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "商家后台",
  description: "仿京东电商平台 — 商家管理端",
};

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
