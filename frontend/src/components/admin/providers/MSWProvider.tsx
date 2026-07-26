"use client";

import { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";

// Fail-closed: mocks only turn on with an explicit "true" opt-in. If this instead
// defaulted to "on unless explicitly false", any environment that forgot to set the
// var (a hosting dashboard that doesn't carry over unset vars, a fresh checkout, etc.)
// would silently boot the entire admin panel against fake in-memory data instead of
// the real backend, with nothing louder than a "Starting mock API…" loader to notice.
const MOCKS_ENABLED = process.env.NEXT_PUBLIC_ADMIN_USE_MOCKS === "true";

/**
 * Boots the MSW browser worker before rendering the admin app so the very
 * first fetch (e.g. the login request) is already intercepted. Only opt in with
 * NEXT_PUBLIC_ADMIN_USE_MOCKS=true for offline UI work when the real PHP backend
 * is unavailable — otherwise this renders children immediately and never touches MSW.
 */
export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKS_ENABLED);

  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    let mounted = true;
    import("@/mocks/admin/browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass" }).then(() => {
        if (mounted) setReady(true);
      })
    );
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return <FullScreenLoader label="Starting mock API…" />;
  return <>{children}</>;
}
