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
  DashboardOutlined,
  ShopOutlined,
  OrderedListOutlined,
  RollbackOutlined,
  UserOutlined,
  TeamOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import Link from "next/link";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "MERCHANT" | "ADMIN";
}

const merchantMenu = [
  { key: "/merchant/dashboard", label: <Link href="/merchant/dashboard">仪表盘</Link>, icon: <DashboardOutlined /> },
  { key: "/merchant/products", label: <Link href="/merchant/products">商品管理</Link>, icon: <ShopOutlined /> },
  { key: "/merchant/orders", label: <Link href="/merchant/orders">订单管理</Link>, icon: <OrderedListOutlined /> },
  { key: "/merchant/refunds", label: <Link href="/merchant/refunds">退款处理</Link>, icon: <RollbackOutlined /> },
  { key: "/merchant/reviews", label: <Link href="/merchant/reviews">评价管理</Link>, icon: <CommentOutlined /> },
];

const adminMenu = [
  { key: "/admin/dashboard", label: <Link href="/admin/dashboard">仪表盘</Link>, icon: <DashboardOutlined /> },
  { key: "/admin/users", label: <Link href="/admin/users">用户管理</Link>, icon: <UserOutlined /> },
  { key: "/admin/merchants", label: <Link href="/admin/merchants">商家管理</Link>, icon: <TeamOutlined /> },
  { key: "/admin/orders", label: <Link href="/admin/orders">订单管理</Link>, icon: <OrderedListOutlined /> },
  { key: "/admin/disputes", label: <Link href="/admin/disputes">纠纷处理</Link>, icon: <AuditOutlined /> },
];

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const menuItems = role === "ADMIN" ? adminMenu : merchantMenu;

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
            {collapsed ? (role === "ADMIN" ? "管理" : "商家") : (role === "ADMIN" ? "管理后台" : "商家后台")}
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
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
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{session?.user?.name || role}</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: "#fff", borderRadius: 8 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
