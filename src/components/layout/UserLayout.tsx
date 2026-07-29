"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
} from "antd";
import {
  HomeOutlined,
  ShoppingCartOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import Link from "next/link";

const { Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: "/", label: <Link href="/">首页</Link>, icon: <HomeOutlined /> },
  { key: "/products", label: <Link href="/products">商品</Link>, icon: <ShoppingCartOutlined /> },
  { key: "/cart", label: <Link href="/cart">购物车</Link>, icon: <ShoppingCartOutlined /> },
  { key: "/orders", label: <Link href="/orders">我的订单</Link>, icon: <OrderedListOutlined /> },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const userMenu = {
    items: [
      { key: "profile", label: "修改密码", icon: <UserOutlined />, onClick: () => router.push("/profile/change-password") },
      { key: "logout", label: "退出登录", icon: <LogoutOutlined />, onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Text strong style={{ fontSize: 18, whiteSpace: "nowrap" }}>
            仿京东商城
          </Text>
          <Menu
            mode="horizontal"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ border: "none", flex: 1, minWidth: 400 }}
          />
        </div>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: "pointer" }}>
            <Avatar icon={<UserOutlined />} />
            <Text>{session?.user?.name || "用户"}</Text>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ background: "#f5f5f5" }}>{children}</Content>
    </Layout>
  );
}
