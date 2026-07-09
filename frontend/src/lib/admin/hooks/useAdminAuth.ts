"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "@/services/AuthService";
import { useAuthStore } from "@/store/useAuthStore";
import { adminQueryKeys } from "../query-keys";

export function useAdminLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}

/** Validates the HttpOnly-cookie session and hydrates the auth store on every protected-page mount. */
export function useAdminMe() {
  return useQuery({
    queryKey: adminQueryKeys.auth.me,
    queryFn: () => AuthService.getMe() as Promise<{ user: any; permissions: string[] }>,
    retry: false,
    staleTime: 60_000,
  });
}
