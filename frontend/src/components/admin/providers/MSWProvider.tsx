"use client";

import { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_ADMIN_USE_MOCKS !== "false";

/**
 * Boots the MSW browser worker before rendering the admin app so the very
 * first fetch (e.g. the login request) is already intercepted. Set
 * NEXT_PUBLIC_ADMIN_USE_MOCKS=false once the real PHP backend is wired up —
 * this then renders children immediately and never touches MSW.
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
