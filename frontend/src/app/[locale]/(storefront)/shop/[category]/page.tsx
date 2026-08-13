import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ShopView } from "@/components/shop/ShopView";
import { getQueryClient } from "@/lib/api/get-query-client";
import { fetchProductsForSeo } from "@/lib/seo/products-list";
import { fetchCategoryForSeo } from "@/lib/seo/category";
import { SITE_URL } from "@/lib/seo/product";
import { localeAlternates } from "@/lib/seo/alternates";

interface CategoryPageParams {
  locale: string;
  category: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CategoryPageParams>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const cat = await fetchCategoryForSeo(category);

  if (!cat) {
    return { title: "Category Not Found" };
  }

  const name = locale === "ar" ? cat.name_ar : cat.name_en;
  const title = `${name} | ASIL Auto Parts Hub`;
  const description = `Shop genuine and aftermarket ${name} auto parts — delivered across the UAE.`;
  const url = `${SITE_URL}/${locale}/shop/${category}`;

  return {
    title,
    description,
    alternates: { canonical: url, languages: localeAlternates(`/shop/${category}`) },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryShopPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  // Matches the exact filters object ShopView builds when a route category overrides
  // the (unset) query-string category — see ShopView's `activeFilters.category =
  // initialCategory` — so the grid renders from prefetched data instead of a skeleton.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["products", { page: 1, category }],
    queryFn: () => fetchProductsForSeo({ page: 1, category }),
  });

  return (
    <div className="min-h-screen bg-background">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ShopView initialCategory={category} hideCategoryFilter={true} />
      </HydrationBoundary>
    </div>
  );
}
