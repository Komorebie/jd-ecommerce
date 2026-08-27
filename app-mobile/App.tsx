// APP 根组件：会话提供者 + 极简路由（按页面栈渲染当前页面）

import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "./src/context/AppContext";
import MainTabs from "./src/screens/MainTabs";
import LoginScreen from "./src/screens/LoginScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";

/** 路由组件：根据页面栈最后一个元素渲染 */
function Router() {
  const { screens } = useApp();
  const current = screens[screens.length - 1];

  switch (current.name) {
    case "login":
      return <LoginScreen />;
    case "main":
      return <MainTabs />;
    case "productDetail":
      return <ProductDetailScreen productId={current.params?.productId as number} />;
    case "checkout":
      return <CheckoutScreen cartItemIds={current.params?.cartItemIds as number[]} />;
    case "orderDetail":
      return <OrderDetailScreen orderId={current.params?.orderId as number} />;
    default:
      return <MainTabs />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="auto" />
      <Router />
    </AppProvider>
  );
}
