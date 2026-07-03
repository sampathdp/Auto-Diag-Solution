export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    current_page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
