import { useApiList, useApiMutation } from "./useApi";
import apiClient from "@/api/client";
import { queryKeys } from "@/api/queryKeys";

export const useAppointments = () => {
  const list = (start: string, end: string, branchId?: number | null, options?: any) => useApiList(
    queryKeys.appointments.list({ start, end, branchId }), 
    async () => {
      const { data } = await apiClient.get('/appointments', { params: { start, end, branch_id: branchId } });
      return data.data;
    },
    options
  );

  const create = () => useApiMutation(
    (data) => apiClient.post('/appointments', data),
    "Appointment scheduled successfully!",
    [queryKeys.appointments.all]
  );

  const update = (id: number) => useApiMutation(
    (data) => apiClient.put(`/appointments/${id}`, data),
    "Appointment updated successfully!",
    [queryKeys.appointments.all]
  );

  const updateAny = () => useApiMutation(
    ({ id, data }: { id: number, data: any }) => apiClient.put(`/appointments/${id}`, data),
    "Appointment updated successfully!",
    [queryKeys.appointments.all]
  );

  const remove = () => useApiMutation(
    (id: number) => apiClient.delete(`/appointments/${id}`),
    "Appointment cancelled successfully!",
    [queryKeys.appointments.all]
  );

  return { list, create, update, updateAny, remove };
};
