"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { DealerSummary, MyDealerApplication } from "@/types/dealer";

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
  return !!useDealerSummary()?.wholesale;
}

/** The signed-in customer's dealer standing (null for non-dealers and staff). */
export function useDealerSummary(): DealerSummary | null {
  const { isAuthenticated, user } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === "customer";
  const mine = useQuery({
    queryKey: ["partner", "mine"],
    queryFn: async () => (await apiClient.get("/account/dealer")).data.data as MyDealerApplication | null,
    enabled: isCustomer,
    staleTime: 60_000,
  });
  return isCustomer ? mine.data?.dealer ?? null : null;
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

/**
 * Dealer prices for every product in a cart or checkout, keyed by product id (same
 * cache entries as useDealerPrice). Empty for everyone who isn't a wholesale dealer.
 * `loading` is true until every price has arrived, so totals never flash retail first.
 */
export function useDealerPrices(productIds: Array<number | string>): { prices: Record<number, DealerPrice>; loading: boolean } {
  const userId = useAuthStore((s) => s.user?.id);
  const isDealer = useIsWholesaleDealer();
  const ids = [...new Set(productIds.map(Number).filter(Boolean))];
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["dealer-pricing", userId, id],
      queryFn: () => loadDealerPrice(id),
      enabled: isDealer,
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const prices: Record<number, DealerPrice> = {};
  if (!isDealer) return { prices, loading: false };
  results.forEach((r, i) => {
    if (r.data && r.data.wholesale != null) prices[ids[i]] = r.data;
  });
  return { prices, loading: results.some((r) => r.isPending && r.fetchStatus !== "idle") };
}

/**
 * Cart/checkout lines with the price the signed-in buyer will actually be charged.
 * For everyone but wholesale dealers this is just the retail price.
 */
export function usePricedLines<T extends { product: { id: string | number; price_aed: number }; quantity: number }>(lines: T[]) {
  const { prices, loading } = useDealerPrices(lines.map((l) => l.product.id));
  return {
    loading,
    lines: lines.map((l) => ({ ...l, ...dealerUnitPrice(l.product.price_aed, l.quantity, prices[Number(l.product.id)]) })),
  };
}

/**
 * The unit price a dealer pays for `quantity` of a product. Mirrors
 * PricingService::unitPrice on the server, which always has the final say: wholesale at
 * or above the minimum quantity, retail below it or when there's no wholesale price.
 */
export function dealerUnitPrice(retail: number, quantity: number, price: DealerPrice | undefined): {
  unitPrice: number;
  wholesale: boolean;
  /** Set when a wholesale price exists but the quantity is below its minimum. */
  minQtyForWholesale: number | null;
} {
  if (!price || price.wholesale == null) return { unitPrice: retail, wholesale: false, minQtyForWholesale: null };
  if (quantity < price.min_qty) return { unitPrice: retail, wholesale: false, minQtyForWholesale: price.min_qty };
  return { unitPrice: price.wholesale, wholesale: true, minQtyForWholesale: null };
}
