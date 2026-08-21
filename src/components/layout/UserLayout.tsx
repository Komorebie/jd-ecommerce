"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Button,
} from "antd";
import {
  HomeOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import Link from "next/link";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: "/", label: <Link href="/">首页</Link>, icon: <HomeOutlined /> },
  { key: "/products", label: <Link href="/products">商品</Link>, icon: <ShoppingOutlined /> },
  { key: "/cart", label: <Link href="/cart">购物车</Link>, icon: <ShoppingCartOutlined /> },
  { key: "/orders", label: <Link href="/orders">我的订单</Link>, icon: <OrderedListOutlined /> },
  { key: "/profile", label: <Link href="/profile">个人中心</Link>, icon: <UserOutlined /> },
];

function getSelectedKey(pathname: string): string {
  if (pathname === "/") return "/";
  const prefix = ["/products", "/cart", "/orders", "/profile"].find((p) => pathname.startsWith(p));
  return prefix ?? pathname;
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const userMenu = session
    ? {
        items: [
          { key: "addresses", label: "收货地址", icon: <EnvironmentOutlined />, onClick: () => router.push("/profile/addresses") },
          { key: "password", label: "修改密码", icon: <UserOutlined />, onClick: () => router.push("/profile/change-password") },
          { key: "logout", label: "退出登录", icon: <LogoutOutlined />, onClick: handleLogout },
        ],
      }
    : { items: [] };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ background: "#fff", borderRight: "1px solid #f0f0f0" }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong style={{ fontSize: collapsed ? 14 : 16, whiteSpace: "nowrap" }}>
            {collapsed ? "商城" : "仿京东商城"}
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey(pathname)]}
          items={menuItems}
          style={{ border: "none" }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fff",
            padding: "0 24px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          {session ? (
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} />
                <Text>{session.user?.name}</Text>
              </Space>
            </Dropdown>
          ) : (
            <Space>
              <Link href="/login">
                <Button type="link">登录</Button>
              </Link>
              <Link href="/register">
                <Button type="primary">注册</Button>
              </Link>
            </Space>
          )}
        </Header>
        <Content style={{ margin: 16, padding: 24, background: "#fff", borderRadius: 8 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
