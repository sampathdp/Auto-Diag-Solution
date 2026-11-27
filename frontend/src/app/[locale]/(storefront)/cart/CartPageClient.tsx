"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/Button";
import { computeCartTotals } from "@/lib/cartTotals";
import { usePricedLines } from "@/hooks/useDealerPricing";
import { CartLinePrice } from "@/components/shop/CartLinePrice";
import toast from "react-hot-toast";

export default function CartPageClient() {
  const locale = useLocale();
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const productIds = items.map((item) => item.productId);
  const { data: products, isLoading } = useProductsByIds(productIds);

  const rawLines = items
    .map((item) => ({ ...item, product: products?.find((p) => p.id === item.productId) }))
    .filter((line): line is typeof line & { product: NonNullable<typeof line.product> } => !!line.product);
  // Dealers see (and are charged) their wholesale price; everyone else gets retail.
  const { lines, loading: loadingPrices } = usePricedLines(rawLines);

  // The cart only ever stores {productId, quantity} — if a product was since deleted
  // or taken off sale, the API silently drops it from the response and it'd otherwise
  // stay in the cart forever (and keep inflating the header's cart-count badge) with
  // no way to see or remove it here. Reconcile the store once product data lands.
  useEffect(() => {
    if (isLoading || !products) return;
    const validIds = new Set(products.map((p) => p.id));
    const staleItems = items.filter((item) => !validIds.has(item.productId));
    if (staleItems.length === 0) return;
    staleItems.forEach((item) => removeItem(item.productId));
    toast.error(
      staleItems.length === 1
        ? "1 item in your cart is no longer available and was removed."
        : `${staleItems.length} items in your cart are no longer available and were removed.`
    );
    // Only re-run when the fetched product set changes — `items`/`removeItem` are read
    // fresh from the closure, not tracked as deps, so removing an item here doesn't
    // immediately re-trigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, products]);

  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);
  const { subtotal, shipping, vat, total } = computeCartTotals(
    lines.map((l) => ({ product: { ...l.product, price_aed: l.unitPrice }, quantity: l.quantity }))
  );

  const handleCheckout = () => {
    router.push("/checkout");
  };

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-wrap px-6 py-8 md:px-14 md:py-12">
      <AccountPageHeader
        title={`Shopping Cart (${totalItems} item${totalItems === 1 ? "" : "s"})`}
        subtitle="Review your items before checkout."
      />

      {items.length > 0 && (isLoading || loadingPrices) ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-card p-8 text-center shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : lines.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-card p-8 text-center shadow-soft">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">Your cart is empty</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Browse the shop and add genuine auto parts to get started.
          </p>
          <Button asChild>
            <Link href="/shop">Browse Shop</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* Line items */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {lines.map(({ product, quantity, unitPrice, wholesale, minQtyForWholesale }) => {
              const p = product;
              const name = locale === "ar" ? p.name_ar : p.name_en;
              return (
                <div key={p.id} className="flex gap-4 rounded-xl bg-card p-4 shadow-soft">
                  <Link
                    href={`/shop/product/${p.id}` as any}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#F5F6F8]"
                  >
                    <img src={p.images[0]} alt={name} className="h-full w-full object-contain p-2" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          {p.brand ? (locale === "ar" ? p.brand.name_ar : p.brand.name_en) : ""}
                        </div>
                        <Link
                          href={`/shop/product/${p.id}` as any}
                          className="line-clamp-1 text-sm font-bold text-foreground hover:text-primary"
                        >
                          {name}
                        </Link>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">SKU: {p.sku}</div>
                      </div>
                      <button
                        onClick={() => removeItem(p.id)}
                        aria-label="Remove"
                        className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-4 pt-3">
                      <div className="flex h-9 items-center rounded-md border">
                        <button
                          onClick={() => updateQuantity(p.id, quantity - 1)}
                          className="flex h-full w-9 items-center justify-center hover:bg-secondary"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="flex w-9 items-center justify-center text-sm font-bold">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(p.id, quantity + 1)}
                          className="flex h-full w-9 items-center justify-center hover:bg-secondary"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <CartLinePrice
                        retail={p.price_aed}
                        unitPrice={unitPrice}
                        quantity={quantity}
                        wholesale={wholesale}
                        minQtyForWholesale={minQtyForWholesale}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={clearCart}
              className="mt-2 self-start text-sm font-bold text-muted-foreground transition-colors hover:text-destructive"
            >
              Clear Cart
            </button>
          </div>

          {/* Order summary */}
          <div className="w-full shrink-0 lg:w-[360px]">
            <div className="sticky top-[100px] rounded-xl bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Order Summary</h3>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">AED {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold text-foreground">
                    {shipping === 0 ? "Free" : `AED ${shipping}`}
                  </span>
                </div>
                {vat > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (5%)</span>
                    <span className="font-semibold text-foreground">AED {vat.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t pt-4">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-2xl font-extrabold text-foreground">AED {total.toLocaleString()}</span>
              </div>
              <Button onClick={handleCheckout} className="mt-6 w-full">
                Proceed to Checkout
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Link href="/shop" className="mt-4 block text-center text-sm font-bold text-primary hover:underline">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
