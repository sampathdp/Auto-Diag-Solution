import type { Product } from "@/types/storefront";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "ASIL Auto Parts Hub";

/**
 * Server-side product fetch for generateMetadata()/JSON-LD — separate from the
 * client-side useProduct() hook (which goes through the axios apiClient, a
 * browser-only module). Next.js dedupes identical fetch() calls within a single
 * request, so generateMetadata() and the page component calling this with the
 * same id only hit the backend once.
 */
export async function fetchProductForSeo(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const item = json?.data;
    if (!item) return null;
    return { ...item, id: String(item.id) } as Product;
  } catch {
    return null;
  }
}

function fitmentLabel(v: Product["compatible_vehicles"][number]): string {
  const years = v.year_from === v.year_to ? `${v.year_from}` : `${v.year_from}-${v.year_to}`;
  return `${v.make} ${v.model} (${years})`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Product Name + primary fitment (Model/Years) + OEM/cross part number + site name. */
export function buildProductMetaTitle(product: Product): string {
  const segments: string[] = [product.name_en];

  const primaryFitment = product.compatible_vehicles[0];
  if (!product.fits_all_vehicles && primaryFitment) {
    segments.push(`for ${fitmentLabel(primaryFitment)}`);
  }

  const partNumber = product.oem_part_number || product.cross_reference_numbers?.[0];
  if (partNumber) {
    segments.push(`OEM ${partNumber}`);
  }

  return truncate(`${segments.join(" | ")} | ${SITE_NAME}`, 70);
}

/** Product Name + all known fitments + OEM/cross numbers, capped to a search-snippet length. */
export function buildProductMetaDescription(product: Product): string {
  const vehicleText = product.fits_all_vehicles
    ? "Universal fit for all vehicles"
    : product.compatible_vehicles.length > 0
      ? `Fits ${product.compatible_vehicles.slice(0, 3).map(fitmentLabel).join(", ")}`
      : null;

  const partNumbers = [
    product.oem_part_number ? `OEM ${product.oem_part_number}` : null,
    ...(product.cross_reference_numbers ?? []).slice(0, 3),
  ].filter((v): v is string => !!v);

  const segments = [
    `Buy ${product.name_en}`,
    vehicleText,
    partNumbers.length > 0 ? `Part #: ${partNumbers.join(", ")}` : null,
    "Genuine auto parts delivered across the UAE.",
  ].filter((v): v is string => !!v);

  return truncate(segments.join(". "), 160);
}

/** Product schema (schema.org/Product) with OEM/cross numbers as MPN + price/stock in Offer. */
export function buildProductJsonLd(product: Product, url: string) {
  const description = stripHtml(product.description_en || product.short_description_en || "");
  const mpn = product.oem_part_number || product.cross_reference_numbers?.[0] || product.sku;

  const availability =
    product.stock_status === "in_stock"
      ? "https://schema.org/InStock"
      : product.stock_status === "backorder"
        ? "https://schema.org/BackOrder"
        : "https://schema.org/OutOfStock";

  const additionalProperty: { "@type": "PropertyValue"; name: string; value: string }[] = [];
  if (product.oem_part_number) {
    additionalProperty.push({ "@type": "PropertyValue", name: "OEM Part Number", value: product.oem_part_number });
  }
  if (product.cross_reference_numbers && product.cross_reference_numbers.length > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Cross Reference Numbers",
      value: product.cross_reference_numbers.join(", "),
    });
  }
  if (!product.fits_all_vehicles && product.compatible_vehicles.length > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Vehicle Fitment",
      value: product.compatible_vehicles.map(fitmentLabel).join("; "),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_en,
    ...(description ? { description } : {}),
    sku: product.sku,
    mpn,
    image: product.images,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name_en } } : {}),
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
    ...(product.reviews > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews } }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "AED",
      price: product.price_aed.toFixed(2),
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}
