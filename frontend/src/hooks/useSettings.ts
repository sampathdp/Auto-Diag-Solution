import { useApiDetails, useApiMutation } from "./useApi";
import apiClient from "@/api/client";

export const useSettings = () => {
  const list = () => useApiDetails(['settings'], async () => {
    const { data } = await apiClient.get('/settings');
    return data.data;
  });

  const save = () => useApiMutation(
    (data: Record<string, any>) => apiClient.post('/settings', data),
    "System settings updated successfully!",
    [['settings']]
  );

  const upgradeSubscription = () => useApiMutation(
    (data: { plan_id: number; payment_method: string }) => apiClient.post('/settings/upgrade', data),
    "Subscription upgraded successfully!",
    [['settings']]
  );

  const listPackages = () => useApiDetails(['public', 'packages'], async () => {
    const { data } = await apiClient.get('/public/packages');
    return data.data;
  });

  return { list, save, upgradeSubscription, listPackages };
};
