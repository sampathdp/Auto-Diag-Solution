import { useApiList, useApiMutation } from "./useApi";
import apiClient from "@/api/client";

export const useInventory = () => {
  const list = (branchId?: number | null, options?: any) => useApiList(
    ['inventory', branchId],
    async () => {
      const params = branchId ? { branch_id: branchId } : {};
      const { data } = await apiClient.get('/inventory', { params });
      return data.data || [];
    },
    options
  );

  const create = () => useApiMutation(
    (data) => apiClient.post('/inventory', data),
    "Product added to inventory!",
    [['inventory']]
  );

  const update = (id: number) => useApiMutation(
    (data) => apiClient.put(`/inventory/${id}`, data),
    "Product updated successfully!",
    [['inventory']]
  );

  const remove = () => useApiMutation(
    (id: number) => apiClient.delete(`/inventory/${id}`),
    "Product removed from inventory!",
    [['inventory']]
  );

  const recordTransaction = () => useApiMutation(
    (data) => apiClient.post('/inventory/transaction', data),
    "Stock updated successfully!",
    [['inventory'], ['inventory', 'logs']]
  );

  const listLogs = (productId?: number, branchId?: number | null) => useApiList(
    ['inventory', 'logs', productId, branchId],
    async () => {
      const params: any = {};
      if (productId) params.product_id = productId;
      if (branchId) params.branch_id = branchId;
      const { data } = await apiClient.get('/inventory/logs', { params });
      return data.data || [];
    }
  );

  return { list, create, update, remove, recordTransaction, listLogs };
};
