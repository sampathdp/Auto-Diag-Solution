import apiClient from '@/api/client';
import { ApiResponse } from '@/types/api';

export abstract class BaseService {
  protected static async get<T>(url: string, params?: any): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(url, { params });
    return response.data.data;
  }

  protected static async post<T>(url: string, data?: any): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  protected static async put<T>(url: string, data?: any): Promise<T> {
    const response = await apiClient.put<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  protected static async httpDelete<T>(url: string): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(url);
    return response.data.data;
  }
}
