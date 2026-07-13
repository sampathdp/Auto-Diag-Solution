"use client";

/**
 * Single call surface for the public storefront GET endpoints (products, categories,
 * brands, vehicle filters). Delegates to the same shared `apiClient` (axios,
 * HttpOnly-cookie JWT, 401-refresh-retry) as the admin panel — see
 * `lib/admin/api-client.ts` for the equivalent admin-prefixed version.
 */
import apiClient from "@/lib/api/client";

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | Record<string, string[]> | null;
  message: string;
}

interface RequestParams {
  [key: string]: string | number | boolean | undefined;
}

async function unwrap<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

export const storefrontApi = {
  get: <T>(path: string, params?: RequestParams) => unwrap<T>(apiClient.get(path, { params })),
};
