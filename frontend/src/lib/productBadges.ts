import type { Product } from "@/types/storefront";

const NEW_WINDOW_DAYS = 30;

/** A product is "New" if it was actually created within the last NEW_WINDOW_DAYS. */
export function isNewProduct(product: Pick<Product, "created_at">): boolean {
  if (!product.created_at) return false;
  const createdAt = new Date(product.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  const ageMs = Date.now() - createdAt;
  return ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
