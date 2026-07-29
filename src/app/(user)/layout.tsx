import type { Metadata } from "next";
import Providers from "@/components/layout/Providers";
import UserLayout from "@/components/layout/UserLayout";

export const metadata: Metadata = {
  title: "仿京东电商平台",
  description: "多角色电商平台 — 用户端",
};

export default function UserRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <UserLayout>{children}</UserLayout>
    </Providers>
  );
}
