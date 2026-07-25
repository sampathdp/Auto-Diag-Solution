import type { Product } from "@/types/storefront";

export const FREE_SHIPPING_THRESHOLD = 500;
export const SHIPPING_FEE = 20;
export const VAT_RATE = 0.05;

export interface CartTotals {
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
}

type TotalsLine = {
  product: Pick<Product, "price_aed" | "vat_inclusive" | "free_shipping">;
  quantity: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A district's configured price — null `rate`/`free_shipping_threshold` fields fall
 * back to the flat SHIPPING_FEE/FREE_SHIPPING_THRESHOLD, same as ShippingService::
 * calculateShipping() does server-side for an unpriced or unselected district. */
export interface ShippingRateOverride {
  rate: number | null;
  free_shipping_threshold: number | null;
}

/**
 * Mirrors backend/app/Services/CheckoutService.php::createOrder() + ShippingService::
 * calculateShipping() exactly — keep the three in sync. A `vat_inclusive` product's
 * price_aed already has VAT baked in (back the tax portion out for display — it's still
 * being collected, just embedded in the price). A `vat_inclusive: false` ("VAT exclusive")
 * product isn't taxed at all — its price is charged exactly as listed, no 5% added on
 * top. Shipping is free only if every line is free_shipping-eligible, or the subtotal
 * clears the applicable threshold (the selected district's, or the flat default) — a
 * mixed cart still pays the fee since it all ships together in one shipment.
 */
export function computeCartTotals(lines: TotalsLine[], shippingRate?: ShippingRateOverride): CartTotals {
  let subtotal = 0;
  let vat = 0;
  let allFreeShipping = lines.length > 0;

  for (const { product, quantity } of lines) {
    const lineTotal = product.price_aed * quantity;
    let exclusive: number;
    let itemVat: number;
    if (product.vat_inclusive) {
      exclusive = round2(lineTotal / (1 + VAT_RATE));
      itemVat = round2(lineTotal - exclusive);
    } else {
      exclusive = lineTotal;
      itemVat = 0;
    }
    subtotal += exclusive;
    vat += itemVat;
    if (!product.free_shipping) allFreeShipping = false;
  }

  subtotal = round2(subtotal);
  vat = round2(vat);

  const fee = shippingRate?.rate ?? SHIPPING_FEE;
  const threshold = shippingRate?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD;
  const qualifiesForFreeShipping = allFreeShipping || subtotal >= threshold;
  const shipping = qualifiesForFreeShipping ? 0 : fee;
  if (shipping > 0) {
    vat = round2(vat + shipping * VAT_RATE);
  }
  const total = round2(subtotal + shipping + vat);

  return { subtotal, shipping, vat, total };
}
