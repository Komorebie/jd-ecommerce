import { Role, User, UserStatus } from "./user";
import { Product, ProductStatus, ProductQuery } from "./product";
import { Order, OrderStatus } from "./order";
import { ApiResponse, PaginatedResult } from "./common";

// ========== Auth ==========

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: "USER" | "MERCHANT";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ========== Product ==========

export interface ProductCreateRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  images: string[];
}

export interface ProductUpdateRequest {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  categoryId?: number;
  images?: string[];
  status?: ProductStatus;
}

// ========== Cart ==========

export interface CartItemRequest {
  productId: number;
  quantity: number;
}

export interface CartItemResponse {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  stock: number;
}

// ========== Order ==========

export interface OrderCreateRequest {
  addressId: number;
  items: { productId: number; quantity: number }[];
  remark?: string;
}

// ========== Refund ==========

export interface RefundRequest {
  orderId: number;
  reason: string;
  amount: number;
}

/** 用户申诉请求：退款被商家拒绝后提交申诉理由 */
export interface RefundAppealRequest {
  appealReason: string;
}

export interface RefundResponse {
  id: number;
  orderId: number;
  orderNo: string;
  userId: number;
  userName: string;
  reason: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "RETURNING" | "REFUNDED" | "REJECTED" | "APPEALING" | "CLOSED";
  rejectReason?: string;
  appealReason?: string;
  appliedAt: string;
  resolvedAt?: string;
}

// ========== Address ==========

export interface AddressRequest {
  receiver: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface AddressResponse {
  id: number;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

// ========== Review ==========

export interface ReviewRequest {
  productId: number;
  orderId: number;
  rating: number;
  content?: string;
}

// ========== Admin ==========

/** 管理员修改用户请求：可修改账号状态或角色 */
export interface AdminUpdateUserRequest {
  status?: UserStatus;
  role?: Role;
}

/** 管理员修改商家请求：审核通过或封禁 */
export interface AdminUpdateMerchantRequest {
  status?: "PENDING" | "ACTIVE" | "BANNED";
}

/** 管理员强制裁决退款请求：最终通过或拒绝，并附处理意见 */
export interface AdminForceResolveRefundRequest {
  action: "APPROVE" | "REJECT";
  reason: string;
}

/** 商家列表项（含关联用户信息），用于管理端商家管理页 */
export interface AdminMerchantItem {
  id: number;
  shopName: string;
  description: string | null;
  logoUrl: string | null;
  status: "PENDING" | "ACTIVE" | "BANNED";
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    status: UserStatus;
  } | null;
}

/** 管理端订单列表项（含用户和商家信息） */
export interface AdminOrderItem {
  id: number;
  orderNo: string;
  totalAmount: number;
  status: OrderStatus;
  paidAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
  merchant: { id: number; shopName: string } | null;
  itemCount: number;
}

/** 管理端退款列表项（含订单和用户信息） */
export interface AdminRefundItem {
  id: number;
  orderId: number;
  orderNo: string;
  userName: string;
  userEmail: string;
  reason: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "RETURNING" | "REFUNDED" | "REJECTED" | "APPEALING" | "CLOSED";
  rejectReason: string | null;
  appealReason: string | null;
  appliedAt: string;
  resolvedAt: string | null;
}

/** 管理端仪表盘统计数据 */
export interface AdminStats {
  userCount: number;
  merchantCount: number;
  productCount: number;
  orderCount: number;
  totalSales: number;
  pendingRefundCount: number;
  orderStatusCounts: Record<OrderStatus, number>;
  recentOrders: {
    id: number;
    orderNo: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    userName: string | null;
  }[];
}

// ========== Merchant ==========

/** 商家端订单列表项（含买家信息和收货地址） */
export interface MerchantOrderItem {
  id: number;
  orderNo: string;
  totalAmount: number;
  status: OrderStatus;
  remark: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
  address: {
    receiver: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
  } | null;
  items: {
    id: number;
    productName: string;
    productImage: string;
    price: number;
    quantity: number;
  }[];
}

/** 商家端退款列表项 */
export interface MerchantRefundItem {
  id: number;
  orderId: number;
  orderNo: string;
  userName: string;
  userEmail: string;
  reason: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "RETURNING" | "REFUNDED" | "REJECTED" | "APPEALING" | "CLOSED";
  rejectReason: string | null;
  appealReason: string | null;
  appliedAt: string;
  resolvedAt: string | null;
}

/** 商家端仪表盘统计数据 */
export interface MerchantStats {
  shopName: string;
  todayOrderCount: number;
  totalSales: number;
  productCount: number;
  lowStockCount: number;
  pendingRefundCount: number;
  pendingShipmentCount: number;
  recentOrders: {
    id: number;
    orderNo: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    userName: string | null;
  }[];
}
