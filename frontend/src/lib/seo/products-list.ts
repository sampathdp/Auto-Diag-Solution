import type { Product, ProductFilters } from "@/types/storefront";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

type ApiProduct = Omit<Product, "id"> & { id: number };

interface ProductListResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Server-side equivalent of hooks/useProducts.ts's fetchProducts() — same param
 * mapping and response shape, but plain fetch() instead of the client-only
 * storefrontApi (a "use client" axios wrapper that can't run in a Server Component).
 * Used to prefetch the default (no-filter) product list so /shop and /shop/[category]
 * render real product cards in the initial HTML instead of a client-only fetch.
 */
export async function fetchProductsForSeo(filters: ProductFilters) {
  const params = new URLSearchParams();
  const raw: Record<string, string | number | undefined> = {
    q: filters.q || undefined,
    category: filters.category || undefined,
    brand: filters.brand && filters.brand.length > 0 ? filters.brand.join(",") : undefined,
    min_price: filters.min_price,
    max_price: filters.max_price,
    in_stock: filters.in_stock ? "1" : undefined,
    fits_year: filters.fits_year || undefined,
    fits_make: filters.fits_make || undefined,
    fits_model: filters.fits_model || undefined,
    rating: filters.rating,
    sort: filters.sort || undefined,
    page: filters.page || 1,
    per_page: filters.per_page || 12,
  };
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) params.set(key, String(value));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const body = json?.data as ProductListResponse | undefined;
    if (!body) return null;

    return {
      data: body.items.map((item) => ({ ...item, id: String(item.id) })) as Product[],
      total: body.total,
      page: body.page,
      totalPages: body.total_pages,
      perPage: body.per_page,
    };
  } catch {
    return null;
  }
}
