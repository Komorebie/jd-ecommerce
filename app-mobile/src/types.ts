// 与后端 API 契约对齐的类型定义
// 注意：金额字段是 string，因为 Prisma Decimal 序列化到 JSON 时为字符串

export type Role = "USER" | "MERCHANT" | "ADMIN";

/** 登录后的用户信息（来自 /api/auth/session） */
export interface SessionUser {
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: number;
  merchantId: number;
  categoryId: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  images: string[];
  status: string;
  salesCount: number;
  merchant?: { shopName?: string };
}

export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  price: string;
  quantity: number;
  stock: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  price: string;
  quantity: number;
}

export interface Refund {
  id: number;
  orderId: number;
  status: string;
  reason: string;
  amount: string;
  rejectReason?: string | null;
  appealReason?: string | null;
  appliedAt: string;
}

export interface Order {
  id: number;
  orderNo: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  merchant?: { shopName: string } | null;
  address?: {
    receiver: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
  } | null;
  items: OrderItem[];
  refunds?: Refund[];
}

export interface Address {
  id: number;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
}

/** 订单状态中文映射 */
export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "待支付", color: "#fa8c16" },
  PENDING_SHIPMENT: { label: "待发货", color: "#1677ff" },
  SHIPPED: { label: "已发货", color: "#13c2c2" },
  REFUNDING: { label: "退款中", color: "#722ed1" },
  COMPLETED: { label: "已完成", color: "#52c41a" },
  CANCELLED: { label: "已取消", color: "#999999" },
  REFUNDED: { label: "已退款", color: "#f5222d" },
};

/** 退款状态中文映射 */
export const REFUND_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待商家审核", color: "#fa8c16" },
  APPROVED: { label: "已同意，待寄回", color: "#1677ff" },
  RETURNING: { label: "已寄回，待确认", color: "#13c2c2" },
  REFUNDED: { label: "已退款", color: "#52c41a" },
  REJECTED: { label: "商家已拒绝", color: "#f5222d" },
  APPEALING: { label: "申诉中", color: "#722ed1" },
  CLOSED: { label: "已关闭", color: "#999999" },
};

/** 金额格式化：Number 转换 + 两位小数 */
export const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;
