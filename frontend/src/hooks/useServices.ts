import { useApiList, useApiMutation } from "./useApi";
import apiClient from "@/api/client";

export const useServices = () => {
  const list = () => useApiList(['services'], async () => {
    const { data } = await apiClient.get('/services');
    return data.data;
  });

  const categories = () => useApiList(['service-categories'], async () => {
    const { data } = await apiClient.get('/service-categories');
    return data.data;
  });

  const create = () => useApiMutation(
    (data) => apiClient.post('/services', data),
    "Service added to menu!",
    [['services']]
  );

  const update = (id: number) => useApiMutation(
    (data) => apiClient.put(`/services/${id}`, data),
    "Service updated successfully!",
    [['services']]
  );

  const remove = () => useApiMutation(
    (id: number) => apiClient.delete(`/services/${id}`),
    "Service removed from menu!",
    [['services']]
  );

  const createCategory = () => useApiMutation(
    (data) => apiClient.post('/service-categories', data),
    "Category created!",
    [['service-categories']]
  );

  const updateCategory = (id: number) => useApiMutation(
    (data) => apiClient.put(`/service-categories/${id}`, data),
    "Category updated!",
    [['service-categories']]
  );

  const removeCategory = () => useApiMutation(
    (id: number) => apiClient.delete(`/service-categories/${id}`),
    "Category deleted!",
    [['service-categories']]
  );

  return { list, categories, create, update, remove, createCategory, updateCategory, removeCategory };
};
