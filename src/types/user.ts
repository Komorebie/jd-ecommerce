export enum Role {
  USER = "USER",
  MERCHANT = "MERCHANT",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  BANNED = "BANNED",
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}
