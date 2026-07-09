"use client";

import { useCallback, useEffect } from "react";

/**
 * Warns before the tab closes/reloads/navigates away while `isDirty` is true
 * (browser-native beforeunload), and exposes `confirmDiscard()` for in-app
 * actions (Cancel button, switching tabs/sections) to gate on the same flag.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const confirmDiscard = useCallback(
    (message = "You have unsaved changes. Discard them?") => {
      if (!isDirty) return true;
      return window.confirm(message);
    },
    [isDirty]
  );

  return { confirmDiscard };
}
