"use client";

import { useEffect } from "react";
import { useWishlistStore } from "@/store/useWishlistStore";

export function GlobalStateInitializer() {
  useEffect(() => {
    // Only init if it hasn't been initialized yet
    const store = useWishlistStore.getState();
    if (!store.isInitialized) {
      store.init();
    }
  }, []);

  return null;
}
