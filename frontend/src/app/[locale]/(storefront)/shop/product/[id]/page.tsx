import type { Metadata } from "next";
import { ProductDetailView } from "@/components/shop/ProductDetailView";
import {
  fetchProductForSeo,
  buildProductMetaTitle,
  buildProductMetaDescription,
  buildProductJsonLd,
  SITE_URL,
} from "@/lib/seo/product";

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
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<ProductPageParams> }) {
  const { locale, id } = await params;
  const product = await fetchProductForSeo(id);
  const jsonLd = product ? buildProductJsonLd(product, `${SITE_URL}/${locale}/shop/product/${id}`) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Escaping "<" prevents the serialized product name/description from
          // prematurely closing this script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <ProductDetailView productId={id} />
    </>
  );
}
