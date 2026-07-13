import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";
import type { Brand } from "@/types/storefront";

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await storefrontApi.get<{ items: Brand[] }>("/brands");
      return res.items;
    },
    staleTime: 5 * 60 * 1000,
  });
}
