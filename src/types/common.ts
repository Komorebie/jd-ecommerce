export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Nullable<T> = T | null;
