import type { Metadata } from "next";
import Providers from "@/components/layout/Providers";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const metadata: Metadata = {
  title: "商家后台",
  description: "仿京东电商平台 — 商家管理端",
};

export default function MerchantRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <DashboardLayout role="MERCHANT">{children}</DashboardLayout>
    </Providers>
  );
}
