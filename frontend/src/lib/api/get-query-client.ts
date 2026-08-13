import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

/**
 * One QueryClient per server request (React's `cache()` dedupes it across every
 * Server Component that calls this during the same render), used to prefetch data
 * before it reaches a client component — see shop/product/[id]/page.tsx. Deliberately
 * separate from the client-side QueryClient created in AppProviders (useState-scoped
 * per browser session): this one only ever lives for a single server render pass.
 */
export const getQueryClient = cache(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
}));
