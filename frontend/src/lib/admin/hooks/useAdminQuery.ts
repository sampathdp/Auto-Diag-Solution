"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";
import { adminApi } from "../api-client";

/** Thin convenience wrapper: GET a path and cache it under the given key. */
export function useAdminQuery<T>(
  queryKey: QueryKey,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  return useQuery({
    queryKey,
    queryFn: () => adminApi.get<T>(path, params),
  });
}
