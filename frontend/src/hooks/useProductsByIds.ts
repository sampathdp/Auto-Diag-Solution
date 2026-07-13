import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";
import type { Product } from "@/types/storefront";

type ApiProduct = Omit<Product, "id"> & { id: number };

/** Batch-fetch full product objects for a set of ids — used by CompareBar/RecentlyViewed
 * which only persist ids in local storage (zustand) and need the full record to render. */
export function useProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: ["products", "by-ids", ids],
    queryFn: async () => {
      const res = await storefrontApi.get<{ items: ApiProduct[] }>("/products", {
        ids: ids.join(","),
        per_page: ids.length,
      });
      const byId = new Map(res.items.map((item) => [String(item.id), { ...item, id: String(item.id) } as Product]));
      // Preserve the caller's original order (compare/recently-viewed order matters).
      return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
    },
    enabled: ids.length > 0,
    staleTime: 30000,
  });
}
