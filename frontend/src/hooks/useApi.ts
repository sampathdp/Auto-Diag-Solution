import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export const useApiList = <T = any>(key: any, fetcher: () => Promise<T[]>, options: any = {}) => {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    ...options
  }) as any;
};

export const useApiDetails = <T = any>(key: any, fetcher: () => Promise<T>) => {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
  }) as any;
};

export const useApiQuery = <T = any>(key: any, url: string, options: any = {}) => {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const response = await import('@/api/client').then(m => m.default.get(url));
      return response.data as T;
    },
    ...options
  }) as any;
};

export const useApiMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage?: string,
  invalidateKeys?: any[]
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      if (invalidateKeys) {
        invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "An error occurred");
    },
  });
};
