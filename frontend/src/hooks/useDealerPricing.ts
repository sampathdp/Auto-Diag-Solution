"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { MyDealerApplication } from "@/types/dealer";

/** One product's prices for the signed-in dealer (POST /account/dealer/pricing). */
export interface DealerPrice {
  retail: number;
  /** null when the product has no wholesale price yet: the dealer pays retail. */
  wholesale: number | null;
  min_qty: number;
  savings: number | null;
  savings_percent: number | null;
}

/**
 * Whether the signed-in user can see wholesale prices right now. Shares the
 * ["partner", "mine"] cache with the partner status card, so it costs no extra request
 * there. The server re-checks on every pricing call; this only decides whether to ask.
 */
export function useIsWholesaleDealer(): boolean {
  const { isAuthenticated, user } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === "customer";
  const mine = useQuery({
    queryKey: ["partner", "mine"],
    queryFn: async () => (await apiClient.get("/account/dealer")).data.data as MyDealerApplication | null,
    enabled: isCustomer,
    staleTime: 60_000,
  });
  return isCustomer && !!mine.data?.dealer?.wholesale;
}

// Every card on a page asks for its own product. Requests made in the same tick are
// merged into one POST, so a grid of 24 products costs one call, not 24.
const MAX_BATCH = 100;
let pending: Map<number, Array<{ resolve: (p: DealerPrice | null) => void; reject: (e: unknown) => void }>> = new Map();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  const batch = pending;
  pending = new Map();
  timer = null;
  const ids = [...batch.keys()];
  for (let i = 0; i < ids.length; i += MAX_BATCH) {
    const chunk = ids.slice(i, i + MAX_BATCH);
    apiClient
      .post("/account/dealer/pricing", { product_ids: chunk })
      .then((res) => {
        const prices = (res.data?.data?.prices ?? {}) as Record<string, DealerPrice>;
        for (const id of chunk) batch.get(id)?.forEach((w) => w.resolve(prices[id] ?? null));
      })
      .catch((err) => {
        for (const id of chunk) batch.get(id)?.forEach((w) => w.reject(err));
      });
  }
}

function loadDealerPrice(productId: number): Promise<DealerPrice | null> {
  return new Promise((resolve, reject) => {
    const waiting = pending.get(productId) ?? [];
    waiting.push({ resolve, reject });
    pending.set(productId, waiting);
    if (!timer) timer = setTimeout(flush, 0);
  });
}

/**
 * The dealer price for one product, or null for everyone who isn't an approved dealer
 * with wholesale access (and for products the dealer pays retail on). Public pages and
 * their caches never carry wholesale data; this fetches it only in the dealer's browser.
 */
export function useDealerPrice(productId: number | undefined): DealerPrice | null {
  const userId = useAuthStore((s) => s.user?.id);
  const isDealer = useIsWholesaleDealer();
  const query = useQuery({
    // The user id keeps one account's prices from showing to the next on a shared browser.
    queryKey: ["dealer-pricing", userId, productId],
    queryFn: () => loadDealerPrice(productId as number),
    enabled: isDealer && !!productId,
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!isDealer || !query.data || query.data.wholesale == null) return null;
  return query.data;
}
