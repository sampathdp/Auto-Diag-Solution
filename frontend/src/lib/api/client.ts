"use client";

import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send HttpOnly auth cookies on every request
});

// NEXT_PUBLIC_API_BASE_URL is inlined at build time, not read at runtime — if it was
// never set in the deploy environment, this silently falls back to the localhost dev
// URL, which turns every API call into a same-origin request that next-intl's
// middleware then redirects into a confusing 404 (e.g. /auth/login -> /en/auth/login)
// instead of a clear network error. Loud enough to be unmissable in the console,
// but never actually blocks the page from rendering.
if (
  typeof window !== "undefined" &&
  !process.env.NEXT_PUBLIC_API_BASE_URL &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname)
) {
  // eslint-disable-next-line no-console
  console.error(
    `[apiClient] NEXT_PUBLIC_API_BASE_URL was not set at build time — API calls are falling back to ${API_BASE_URL}, ` +
      "which will fail on this domain. Set NEXT_PUBLIC_API_BASE_URL in the deployment's environment variables and redeploy."
  );
}

apiClient.interceptors.request.use((config) => {
  // Let the browser set Content-Type with boundary for multipart uploads
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Single shared promise so multiple simultaneous 401s share one refresh call
let refreshingPromise: Promise<void> | null = null;

const forceLogout = () => {
  useAuthStore.getState().logout();
  if (typeof window !== "undefined") {
    const locale = window.location.pathname.split("/")[1] || "en";
    window.location.href = `/${locale}/login`;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshingPromise) {
          refreshingPromise = axios
            .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then(() => undefined)
            .finally(() => {
              refreshingPromise = null;
            });
        }

        await refreshingPromise;
        return apiClient(originalRequest);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
