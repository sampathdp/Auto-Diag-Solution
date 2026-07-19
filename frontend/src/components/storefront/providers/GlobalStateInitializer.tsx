"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWishlistStore } from "@/store/useWishlistStore";

export function GlobalStateInitializer() {
  // Guests have no wishlist to fetch — calling init() for them 401s, which the
  // apiClient interceptor treats as an expired session and hard-redirects to
  // /login, remounting this component and repeating forever. Gate on auth so
  // the fetch only happens for a real, logged-in session.
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    const store = useWishlistStore.getState();
    if (!store.isInitialized) {
      store.init();
    }
  }, [isAuthenticated]);

  // The storefront never uses MSW — but a browser that previously visited /admin
  // (where MSW registers a site-root-scoped service worker) can be left with a
  // stale worker that keeps intercepting real fetches here too, breaking API
  // calls with no visible cause. Clear it out on every storefront page load.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }, []);

  return null;
}
