import { useApiList, useApiMutation } from "./useApi";
import apiClient from "@/api/client";

export const useCustomers = () => {
  const list = (branchId?: number | null) => useApiList(['customers', branchId], async () => {
    const params = branchId ? { branch_id: branchId } : {};
    const { data } = await apiClient.get('/customers', { params });
    return data.data;
  });

  const create = () => useApiMutation(
    (data) => apiClient.post('/customers', data),
    "Customer registered successfully!",
    [['customers']]
  );

  const update = (id: number) => useApiMutation(
    (data) => apiClient.put(`/customers/${id}`, data),
    "Customer updated successfully!",
    [['customers']]
  );

  const remove = () => useApiMutation(
    (id: number) => apiClient.delete(`/customers/${id}`),
    "Customer removed successfully!",
    [['customers']]
  );

  const history = (id: number) => useApiList(
    ['customers', id, 'history'],
    async () => {
      const { data } = await apiClient.get(`/customers/${id}/appointments`);
      return data.data;
    },
    { enabled: !!id }
  );

  return { list, create, update, remove, history };
};
