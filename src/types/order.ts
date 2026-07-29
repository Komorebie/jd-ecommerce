export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PENDING_SHIPMENT = "PENDING_SHIPMENT",
  SHIPPED = "SHIPPED",
  REFUNDING = "REFUNDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  merchantId: number;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItem[];
  address: string;
  remark?: string;
  paidAt?: string;
  shippedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}
