import { format } from "date-fns";
import type { Product } from "@/mocks/admin/db";

export function formatAED(amount: number | string | null | undefined): string {
  const num = typeof amount === "number" ? amount : Number(amount ?? 0);
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "dd MMM yyyy");
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "dd MMM yyyy, HH:mm");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Mimics the backend's APU-##### SKU convention for the "auto-generate" button. */
export function generateSku(): string {
  return `APU-${Math.floor(10000 + Math.random() * 89999)}`;
}

export type ProductStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getProductStockStatus(
  product: Pick<Product, "stock_quantity" | "low_stock_threshold" | "track_inventory">
): ProductStockStatus {
  if (!product.track_inventory) return "in_stock";
  if (product.stock_quantity === 0) return "out_of_stock";
  if (product.stock_quantity <= product.low_stock_threshold) return "low_stock";
  return "in_stock";
}

/** What the list's status badge should actually show — out-of-stock takes visual priority over the stored status. */
export function getProductDisplayStatus(
  product: Pick<Product, "status" | "stock_quantity" | "low_stock_threshold" | "track_inventory">
): "draft" | "active" | "inactive" | "out_of_stock" {
  if (product.status === "active" && getProductStockStatus(product) === "out_of_stock") return "out_of_stock";
  return product.status;
}
