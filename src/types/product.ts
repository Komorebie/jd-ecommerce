export enum ProductStatus {
  ON_SALE = "ON_SALE",
  OFF_SHELF = "OFF_SHELF",
  BANNED = "BANNED",
}

export interface Product {
  id: number;
  merchantId: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  status: ProductStatus;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQuery {
  keyword?: string;
  categoryId?: number;
  merchantId?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "price" | "salesCount" | "createdAt";
  sortOrder?: "asc" | "desc";
}
