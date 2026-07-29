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

export interface RefundResponse {
  id: number;
  orderId: number;
  orderNo: string;
  userId: number;
  userName: string;
  reason: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";
  rejectReason?: string;
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

export interface AdminUpdateUserRequest {
  status?: UserStatus;
  role?: Role;
}

export interface AdminUpdateMerchantRequest {
  status?: "PENDING" | "ACTIVE" | "BANNED";
}
