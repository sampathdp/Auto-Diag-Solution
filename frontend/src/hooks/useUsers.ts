import { useApiList, useApiMutation } from "./useApi";
import apiClient from "@/api/client";

export const useUsers = () => {
  const list = () => useApiList(['users'], async () => {
    const { data } = await apiClient.get('/users');
    return data.data;
  });

  const create = () => useApiMutation(
    (data) => apiClient.post('/users', data),
    "User created successfully!",
    [['users']]
  );

  const update = (id: number) => useApiMutation(
    (data) => apiClient.put(`/users/${id}`, data),
    "User updated successfully!",
    [['users']]
  );

  const remove = () => useApiMutation(
    (id: number) => apiClient.delete(`/users/${id}`),
    "User deleted successfully!",
    [['users']]
  );

  return { list, create, update, remove };
};
