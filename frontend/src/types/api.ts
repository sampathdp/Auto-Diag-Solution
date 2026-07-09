// Mirrors the backend's standard response envelope: { success, data, error, message }
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | Record<string, string[]> | null;
  message: string;
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
