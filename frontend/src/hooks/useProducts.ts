import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront-client";
import type { Product, ProductFilters } from "@/types/storefront";

type ApiProduct = Omit<Product, "id"> & { id: number };

type ProductListResponse = {
  items: ApiProduct[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

function toParams(filters: ProductFilters) {
  return {
    q: filters.q || undefined,
    category: filters.category || undefined,
    brand: filters.brand && filters.brand.length > 0 ? filters.brand.join(",") : undefined,
    min_price: filters.min_price,
    max_price: filters.max_price,
    in_stock: filters.in_stock || undefined,
    fits_year: filters.fits_year || undefined,
    fits_make: filters.fits_make || undefined,
    fits_model: filters.fits_model || undefined,
    rating: filters.rating,
    sort: filters.sort,
    page: filters.page || 1,
    per_page: filters.per_page || 12,
    ids: filters.ids && filters.ids.length > 0 ? filters.ids.join(",") : undefined,
  };
}

async function fetchProducts(filters: ProductFilters) {
  const res = await storefrontApi.get<ProductListResponse>("/products", toParams(filters));
  return {
    data: res.items.map((item) => ({ ...item, id: String(item.id) })) as Product[],
    total: res.total,
    page: res.page,
    totalPages: res.total_pages,
    perPage: res.per_page,
  };
}

export function useProducts(filters: ProductFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData,
    staleTime: 30000,
    enabled: options?.enabled,
  });
}
