import { useApiList, useApiMutation } from "./useApi";
import apiClient from "@/api/client";

export const useStaff = () => {
  const list = () => useApiList(['staff'], async () => {
    const { data } = await apiClient.get('/staff');
    // data.data = { staff: [], max_staff: N } — return the full object
    return data.data;
  });

  const create = () => useApiMutation(
    (data) => apiClient.post('/staff', data),
    "Staff member added!",
    [['staff']]
  );

  const update = (id: number) => useApiMutation(
    (data) => apiClient.put(`/staff/${id}`, data),
    "Staff member updated!",
    [['staff']]
  );

  const remove = () => useApiMutation(
    (id: number) => apiClient.delete(`/staff/${id}`),
    "Staff member removed!",
    [['staff']]
  );

  const changePassword = () => useApiMutation(
    ({ id, password }: { id: number; password: string }) =>
      apiClient.put(`/staff/${id}/password`, { password }),
    "Password updated successfully!"
  );

  return { list, create, update, remove, changePassword };
};
