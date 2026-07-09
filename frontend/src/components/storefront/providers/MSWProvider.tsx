"use client";

import { useEffect, useState } from "react";

/**
 * Boots the MSW browser worker before rendering the storefront app so the very
 * first client-side requests are guaranteed to be intercepted.
 */
export function StorefrontMSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only run in the browser, and only in development
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
      setReady(true);
      return;
    }

    import("@/mocks/storefront/browser").then(({ worker }) =>
      worker
        .start({
          onUnhandledRequest: "bypass",
        })
        .then(() => setReady(true))
        .catch(console.error)
    );
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
