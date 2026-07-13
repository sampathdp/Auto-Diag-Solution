import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";
import type { Product } from "@/types/storefront";

type ApiProduct = Omit<Product, "id"> & { id: number };

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const item = await storefrontApi.get<ApiProduct>(`/products/${id}`);
      return { ...item, id: String(item.id) } as Product;
    },
    enabled: !!id,
    retry: false,
  });
}
