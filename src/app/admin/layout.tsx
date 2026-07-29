import type { Metadata } from "next";
import Providers from "@/components/layout/Providers";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const metadata: Metadata = {
  title: "管理员后台",
  description: "仿京东电商平台 — 平台管理端",
};

export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <DashboardLayout role="ADMIN">{children}</DashboardLayout>
    </Providers>
  );
}
