import type { Category } from "@/types/storefront";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

/**
 * Server-side category lookup for generateMetadata() — there's no single
 * GET /categories/{slug} endpoint, so this fetches the (small, cached) active list
 * and finds the match, mirroring how ShopView already resolves category names
 * client-side via useCategories().
 */
export async function fetchCategoryForSeo(slug: string): Promise<Category | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const items = (json?.data?.items ?? []) as Category[];
    return items.find((c) => c.slug === slug) ?? null;
  } catch {
    return null;
  }
}
