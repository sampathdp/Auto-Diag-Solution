import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";
import type { Category } from "@/types/storefront";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await storefrontApi.get<{ items: Category[] }>("/categories");
      return res.items;
    },
    staleTime: 5 * 60 * 1000,
  });
}
