import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send HttpOnly cookies on every request
});

apiClient.interceptors.request.use((config) => {
  const targetSalonId = useAuthStore.getState().targetSalonId;
  if (targetSalonId) config.headers['X-Target-Salon-Id'] = targetSalonId;

  // Let the browser set Content-Type with boundary for multipart uploads
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Single shared promise so multiple simultaneous 401s share one refresh call
let refreshingPromise: Promise<void> | null = null;

const forceLogout = () => {
  useAuthStore.getState().logout();
  window.location.href = '/login';
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Deduplicate: all simultaneous 401s wait on the same refresh call.
        // The refresh_token cookie is sent automatically via withCredentials.
        if (!refreshingPromise) {
          refreshingPromise = axios
            .post(
              (import.meta.env.VITE_API_BASE_URL || '/api/v1') + '/auth/refresh',
              {},
              { withCredentials: true }
            )
            .then(() => undefined)
            .finally(() => {
              refreshingPromise = null;
            });
        }

        await refreshingPromise;
        // New access_token cookie was set by the server — retry the original request
        return apiClient(originalRequest);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }

    // Handle SUBSCRIPTION_EXPIRED block
    if (error.response?.status === 403 && error.response?.data?.message?.startsWith('SUBSCRIPTION_EXPIRED')) {
      window.dispatchEvent(new CustomEvent('subscriptionExpired'));
    }

    if (error.response?.status === 403 && error.response?.data?.message?.startsWith('PAYMENT_PENDING')) {
      window.dispatchEvent(new CustomEvent('paymentPending'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
