import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { mockFetchProducts, ProductFilters } from "@/mocks/storefront/data";

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => mockFetchProducts(filters),
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });
}
