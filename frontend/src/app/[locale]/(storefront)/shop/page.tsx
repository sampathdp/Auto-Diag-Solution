import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ShopView } from "@/components/shop/ShopView";
import { getQueryClient } from "@/lib/api/get-query-client";
import { fetchProductsForSeo } from "@/lib/seo/products-list";
import { SITE_URL } from "@/lib/seo/product";
import { localeAlternates } from "@/lib/seo/alternates";

const TITLE = "Shop All Auto Parts | ASIL Auto Parts Hub";
const DESCRIPTION = "Browse genuine and aftermarket auto parts by category, brand, or vehicle fitment — delivered across the UAE.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const url = `${SITE_URL}/${locale}/shop`;

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: url, languages: localeAlternates("/shop") },
    openGraph: { title: TITLE, description: DESCRIPTION, url, type: "website" },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  };
}

export default async function ShopPage() {
  // Matches the exact default filters object ShopView/useShopFilters produces
  // client-side when no query params are present (["products", { page: 1 }]) — the
  // ProductCard grid renders from this prefetched data on first paint instead of an
  // empty skeleton.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["products", { page: 1 }],
    queryFn: () => fetchProductsForSeo({ page: 1 }),
  });

  return (
    <div className="min-h-screen bg-background">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ShopView />
      </HydrationBoundary>
    </div>
  );
}
