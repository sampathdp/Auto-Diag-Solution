import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ProductDetailView } from "@/components/shop/ProductDetailView";
import { getQueryClient } from "@/lib/api/get-query-client";
import {
  fetchProductForSeo,
  buildProductMetaTitle,
  buildProductMetaDescription,
  buildProductJsonLd,
  SITE_URL,
} from "@/lib/seo/product";
import { localeAlternates } from "@/lib/seo/alternates";

interface ProductPageParams {
  locale: string;
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ProductPageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await fetchProductForSeo(id);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const title = buildProductMetaTitle(product);
  const description = buildProductMetaDescription(product);
  const url = `${SITE_URL}/${locale}/shop/product/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url, languages: localeAlternates(`/shop/product/${id}`) },
    openGraph: {
      title,
      description,
      url,
      images: product.images.slice(0, 1),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<ProductPageParams> }) {
  const { locale, id } = await params;

  // Prefetch on the server with the exact queryKey useProduct() uses client-side
  // ("product", id) — ProductDetailView then reads this straight out of the hydrated
  // cache during the same SSR pass instead of firing a second client-only fetch, so
  // the product's name/price/description actually land in the HTML crawlers see.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductForSeo(id),
  });

  const product = queryClient.getQueryData<Awaited<ReturnType<typeof fetchProductForSeo>>>(["product", id]);
  const jsonLd = product ? buildProductJsonLd(product, `${SITE_URL}/${locale}/shop/product/${id}`) : null;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Escaping "<" prevents the serialized product name/description from
          // prematurely closing this script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <ProductDetailView productId={id} />
    </HydrationBoundary>
  );
}
