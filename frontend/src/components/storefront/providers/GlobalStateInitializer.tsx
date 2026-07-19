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

  return null;
}
