import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

// Sitemap is regenerated at most once an hour — a new admin-added product shows up
// here without a redeploy, just a short delay, which is the point of fetching the
// live product list instead of hand-maintaining URLs.
export const revalidate = 3600;

const STATIC_PATHS = ["", "/shop", "/about", "/contact"];

interface PublicProductRow {
  id: number;
  updated_at?: string | null;
}

interface ProductListEnvelope {
  data: {
    items: PublicProductRow[];
    total_pages: number;
  };
}

async function fetchAllActiveProducts(): Promise<PublicProductRow[]> {
  const products: PublicProductRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/products?page=${page}&per_page=60`, {
        next: { revalidate },
      });
    } catch {
      break;
    }
    if (!res.ok) break;

    const body = (await res.json()) as ProductListEnvelope;
    products.push(...(body.data?.items ?? []));
    totalPages = body.data?.total_pages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return products;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchAllActiveProducts();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        changeFrequency: "daily",
        priority: path === "" ? 1 : 0.7,
      });
    }

    for (const product of products) {
      entries.push({
        url: `${SITE_URL}/${locale}/shop/product/${product.id}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
