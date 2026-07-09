"use client";

/**
 * Single call surface for every admin API call (`adminApi.get/post/put/patch/delete`).
 * Delegates to the same shared `apiClient` (axios, HttpOnly-cookie JWT, 401-refresh-retry)
 * already proven against the real backend by the storefront/login pages — this file just
 * prefixes admin paths with `/admin` and keeps the exact same public method signatures the
 * 19 existing admin pages already call, so no page-level code needed to change.
 *
 * Real backend admin routes live at `/api/v1/admin/*`; `apiClient`'s baseURL already
 * includes `/api/v1`, so this file only ever needs to add the `/admin` segment.
 */
import type { AxiosError } from "axios";
import apiClient from "@/lib/api/client";

const ADMIN_PREFIX = "/admin";

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | Record<string, string[]> | null;
  message: string;
}

interface RequestParams {
  [key: string]: string | number | boolean | undefined;
}

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function toApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError<Envelope<unknown>>;
  if (axiosError?.isAxiosError) {
    const status = axiosError.response?.status ?? 0;
    const envelope = axiosError.response?.data;
    return new ApiError(envelope?.message || axiosError.message, status, envelope?.error ?? null);
  }
  return new ApiError(error instanceof Error ? error.message : "Unknown error", 0, null);
}

async function unwrap<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  try {
    const response = await promise;
    return response.data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export const adminApi = {
  get: <T>(path: string, params?: RequestParams) =>
    unwrap<T>(apiClient.get(`${ADMIN_PREFIX}${path}`, { params })),
  post: <T>(path: string, body?: unknown) =>
    unwrap<T>(apiClient.post(`${ADMIN_PREFIX}${path}`, body)),
  put: <T>(path: string, body?: unknown) =>
    unwrap<T>(apiClient.put(`${ADMIN_PREFIX}${path}`, body)),
  patch: <T>(path: string, body?: unknown) =>
    unwrap<T>(apiClient.patch(`${ADMIN_PREFIX}${path}`, body)),
  delete: <T>(path: string) =>
    unwrap<T>(apiClient.delete(`${ADMIN_PREFIX}${path}`)),
};
