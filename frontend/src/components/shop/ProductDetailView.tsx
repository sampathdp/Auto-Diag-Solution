"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronRight,
  Heart,
  Scale,
  MessageCircle,
  ShoppingCart,
  Star,
  Loader2,
  Check,
  CheckCircle2,
  Truck,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useProduct } from "@/hooks/useProduct";
import { isNewProduct } from "@/lib/productBadges";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/Button";
import { CheckFitmentWidget } from "./CheckFitmentWidget";
import { PartTypeBadge } from "./PartTypeBadge";
import { ProductCard } from "./ProductCard";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useCompareStore } from "@/store/useCompareStore";
import { useCartStore } from "@/store/useCartStore";
import { useRecentlyViewedStore } from "@/store/useRecentlyViewedStore";
import { useFlyToCart } from "@/hooks/useFlyToCart";
import { useContactInfo } from "@/hooks/useContactInfo";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import toast from "react-hot-toast";
import { DealerPriceLine } from "./DealerPriceLine";

export function ProductDetailView({ productId }: { productId: string }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("shop.quickView");
  const tToast = useTranslations("shop.toasts");
  const { data: siteInfo } = useContactInfo();

  const { data: product, isLoading } = useProduct(productId);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartState, setCartState] = useState<"idle" | "loading" | "success">("idle");
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "compatibility" | "shipping" | "reviews">(
    "description"
  );

  const isWishlisted = useWishlistStore((state) => (product ? state.hasItem(product.id) : false));
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const isCompared = useCompareStore((state) => (product ? state.hasItem(product.id) : false));
  const toggleCompare = useCompareStore((state) => state.toggleItem);
  const compareCount = useCompareStore((state) => state.items.length);
  const addToCart = useCartStore((state) => state.addItem);
  const { triggerFly, flyPortal } = useFlyToCart();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (product) {
      useRecentlyViewedStore.getState().addViewedItem(product.id);
    }
  }, [product]);

  // Prefer "other parts for this same vehicle" (e.g. viewing a Suzuki Every rear brake
  // shoe set should surface Suzuki Every front pads/filters/etc., not just anything in
  // the same category) over a plain category match. Universal parts (fits_all_vehicles,
  // no compatible_vehicles row) have no vehicle to key off of, so those fall back to the
  // old category-based related list.
  const primaryFitment = product?.compatible_vehicles?.[0];
  const { data: relatedData } = useProducts(
    primaryFitment
      ? { fits_make: primaryFitment.make, fits_model: primaryFitment.model, per_page: 8 }
      : { category: product?.category?.slug, per_page: 8 },
    { enabled: !!(primaryFitment || product?.category?.slug) }
  );

  if (!product) {
    if (isLoading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <div className="mx-auto flex max-w-wrap flex-col items-center justify-center px-6 py-32 text-center md:px-14">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This part may have been removed or is no longer available.</p>
        <Button asChild className="mt-6">
          <Link href="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const categoryName = product.category ? (locale === "ar" ? product.category.name_ar : product.category.name_en) : null;

  const isOutOfStock = product.stock === 0;
  const hasDiscount = !!product.compare_at_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price_aed) / product.compare_at_price!) * 100)
    : 0;
  const isNew = isNewProduct(product);

  const relatedProducts = (relatedData?.data || []).filter((p) => p.id !== product.id).slice(0, 4);

  const specRows = [
    ...(product.brand ? [{ label: t("specBrand"), value: locale === "ar" ? product.brand.name_ar : product.brand.name_en }] : []),
    { label: t("specSku"), value: product.sku },
    {
      label: t("specCompatibility"),
      value: product.fits_all_vehicles ? t("universalFit") : t("seeFitment", { count: product.compatible_vehicles.length }),
    },
    ...(product.oem_part_number ? [{ label: t("specOemPartNumber"), value: product.oem_part_number }] : []),
    ...(product.material ? [{ label: t("specMaterial"), value: product.material }] : []),
    ...(product.country_of_origin ? [{ label: t("specCountryOrigin"), value: product.country_of_origin }] : []),
    ...(product.specifications || []).map((s) => ({
      label: locale === "ar" ? s.key_ar : s.key_en,
      value: locale === "ar" ? s.value_ar : s.value_en,
    })),
  ];

  const specTableRows = [
    ...(product.part_type
      ? [{ label: t("specPartType"), value: <PartTypeBadge type={product.part_type} /> }]
      : []),
    ...(product.oem_part_number ? [{ label: t("specOemPartNumber"), value: product.oem_part_number }] : []),
    ...(product.material ? [{ label: t("specMaterial"), value: product.material }] : []),
    ...(product.country_of_origin ? [{ label: t("specCountryOrigin"), value: product.country_of_origin }] : []),
    ...(product.specifications || []).map((s) => ({
      label: locale === "ar" ? s.key_ar : s.key_en,
      value: locale === "ar" ? s.value_ar : s.value_en,
    })),
  ];

  const trustItems = [
    ...(product.free_shipping ? [{ icon: Truck, title: t("freeShipping"), note: t("freeShippingNote") }] : []),
    { icon: Truck, title: t("fastDelivery"), note: t("fastDeliveryNote") },
    { icon: ShieldCheck, title: t("securePayment"), note: t("securePaymentNote") },
    { icon: RotateCcw, title: t("easyReturns"), note: t("easyReturnsNote") },
  ];

  const tabs = [
    { key: "description" as const, label: t("tabDescription") },
    { key: "specifications" as const, label: t("tabSpecifications") },
    { key: "compatibility" as const, label: t("tabCompatibility") },
    { key: "shipping" as const, label: t("tabShipping") },
    { key: "reviews" as const, label: `${t("tabReviews")} (${product.reviews})` },
  ];

  const description =
    (locale === "ar" ? product.description_ar : product.description_en) ||
    (locale === "ar" ? product.short_description_ar : product.short_description_en);

  const handleToggleWishlist = () => {
    if (!isWishlisted) toast.success(tToast("addedToWishlist"));
    toggleWishlist(product.id);
  };

  const handleToggleCompare = () => {
    if (!isCompared && compareCount >= 3) {
      toast.error(tToast("compareLimitReached"));
      return;
    }
    toggleCompare(product.id);
  };

  const handleAddToCart = () => {
    if (isOutOfStock || cartState !== "idle") return;
    setCartState("loading");
    setTimeout(() => {
      addToCart(product.id, quantity);
      setCartState("success");
      triggerFly(buttonRef.current);
      setTimeout(() => setCartState("idle"), 2000);
    }, 400);
  };

  // Express single-item checkout — bypasses the cart entirely (whatever's already in
  // the cart is untouched) and goes straight to /checkout for just this product.
  const handleBuyNow = () => {
    if (isOutOfStock) return;
    router.push(`/checkout?buyNow=${product.id}&qty=${quantity}` as any);
  };

  const whatsappHref = buildWhatsAppUrl(
    siteInfo?.whatsapp_number,
    `Hi, I'd like to ask about ${name} (SKU: ${product.sku})`
  );

  return (
    <div className="bg-background">
      {/* Breadcrumb */}
      <div className="border-b">
        <nav className="mx-auto flex max-w-wrap items-center gap-x-3 gap-y-2 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:px-14">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          {categoryName && (
            <>
              <ChevronRight className="h-3 w-3 rtl:rotate-180" />
              <Link href={`/shop/${product.category!.slug}` as any} className="hover:text-foreground transition-colors">{categoryName}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-foreground">{name}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-wrap px-6 py-10 md:px-14 md:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F5F6F8] shadow-soft">
              <span
                aria-hidden
                className="pointer-events-none absolute start-4 top-4 z-10 h-4 w-4 border-s-2 border-t-2 border-foreground/10"
              />
              <img
                src={product.images[activeImage] || "/placeholder-product.svg"}
                alt={name}
                fetchPriority="high"
                className={`absolute inset-0 h-full w-full object-contain p-10 ${isOutOfStock ? "opacity-50 grayscale" : ""}`}
              />
              {isOutOfStock && (
                <span className="absolute left-4 top-4 rounded bg-destructive px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground rtl:left-auto rtl:right-4">
                  Out of Stock
                </span>
              )}
              {!isOutOfStock && hasDiscount && (
                <span className="absolute left-4 top-4 rounded bg-destructive px-2.5 py-1 text-[10px] font-bold tracking-wider text-destructive-foreground shadow-sm rtl:left-auto rtl:right-4">
                  -{discountPercent}%
                </span>
              )}
              {!isOutOfStock && !hasDiscount && isNew && (
                <span className="absolute left-4 top-4 rounded bg-primary-accessible px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary-foreground shadow-sm rtl:left-auto rtl:right-4">
                  NEW
                </span>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-[#F5F6F8] p-2 transition-colors ${
                      activeImage === idx ? "border-primary" : "border-transparent hover:border-border"
                    }`}
                  >
                    <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6">
              <CheckFitmentWidget product={product} />
            </div>

            {/* Trust badges */}
            <div
              className="mt-6 grid divide-x divide-border rounded-lg border text-center rtl:divide-x-reverse"
              style={{ gridTemplateColumns: `repeat(${trustItems.length}, minmax(0, 1fr))` }}
            >
              {trustItems.map(({ icon: Icon, title, note }) => (
                <div key={title} className="flex flex-col items-center gap-1.5 px-2 py-4">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">{title}</span>
                  <span className="text-[11px] text-muted-foreground">{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span>{product.brand ? (locale === "ar" ? product.brand.name_ar : product.brand.name_en) : ""}</span>
              {product.part_type && <PartTypeBadge type={product.part_type} />}
            </div>
            <h1 className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
              {name}
            </h1>

            <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-warning text-warning" : "text-muted"}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">{product.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({product.reviews})</span>
              </div>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="font-mono text-sm text-muted-foreground">SKU: {product.sku}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  isOutOfStock ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {isOutOfStock ? t("outOfStock") : t("inStock")}
              </span>
              {product.free_shipping && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-info">
                  <Truck className="h-3 w-3" />
                  {t("freeShipping")}
                </span>
              )}
            </div>

            <div className="mb-6 flex items-baseline gap-4">
              <span className={`text-4xl font-extrabold tracking-tight ${hasDiscount ? "text-destructive" : "text-foreground"}`}>
                AED {product.price_aed.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-lg font-medium text-muted-foreground line-through">
                  AED {product.compare_at_price!.toLocaleString()}
                </span>
              )}
              <span className="text-xs font-medium text-muted-foreground uppercase">{product.vat_inclusive ? "VAT incl." : "+ VAT"}</span>
            </div>
            <DealerPriceLine productId={product.id} size="lg" className="-mt-3 mb-6" />

            {!isOutOfStock && product.stock <= 10 && (
              <div className="mb-6 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-warning">Only {product.stock} left</span>
              </div>
            )}

            <dl className="mb-6 divide-y divide-border rounded-lg border">
              {specRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-end font-semibold text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>

            {/* Add to Cart Area */}
            <div className="mb-8 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 items-center rounded-md border bg-background">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-full w-12 items-center justify-center text-lg hover:bg-secondary"
                  >-</button>
                  <span className="flex w-12 items-center justify-center font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                    className="flex h-full w-12 items-center justify-center text-lg hover:bg-secondary"
                  >+</button>
                </div>

                <button
                  ref={buttonRef}
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="flex h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-md bg-primary-accessible text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-cta transition-all hover:-translate-y-0.5 hover:bg-primary-accessible/90 hover:shadow-lifted disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-y-0 sm:text-[13px]"
                >
                  {cartState === "idle" && (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      {isOutOfStock ? t("outOfStock") : t("addToCart")}
                    </>
                  )}
                  {cartState === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
                  {cartState === "success" && (
                    <>
                      <Check className="h-5 w-5" /> Added!
                    </>
                  )}
                </button>

                <button
                  onClick={handleToggleWishlist}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-background text-foreground shadow-soft transition-colors hover:text-primary"
                >
                  <Heart className={`h-5 w-5 transition-colors ${isWishlisted ? "fill-primary text-primary" : ""}`} />
                </button>

                <button
                  onClick={handleToggleCompare}
                  aria-label={isCompared ? "Remove from compare" : "Add to compare"}
                  aria-pressed={isCompared}
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md border shadow-soft transition-colors ${
                    isCompared ? "bg-primary-accessible text-primary-foreground border-primary" : "bg-background text-foreground hover:text-primary-accessible"
                  }`}
                >
                  <Scale className="h-5 w-5" />
                </button>
              </div>

              {!isOutOfStock && (
                <button
                  onClick={handleBuyNow}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-navy text-xs font-bold uppercase tracking-wide text-navy-foreground shadow-cta transition-all hover:-translate-y-0.5 hover:bg-navy/90 hover:shadow-lifted sm:text-[13px]"
                >
                  {t("buyNow")}
                </button>
              )}

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 border-success text-xs font-bold uppercase tracking-wide text-success transition-all hover:bg-success hover:text-success-foreground sm:text-[13px]"
              >
                <MessageCircle className="h-5 w-5" />
                {t("askWhatsApp")}
              </a>
            </div>
          </div>
        </div>

        {/* Info Tabs */}
        <section className="mt-16 border-t pt-2">
          <div className="flex gap-8 overflow-x-auto border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 border-b-2 py-4 text-sm font-bold transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === "description" && (
              <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {description ? (
                  <div
                    className="[&_p]:mb-3 last:[&_p]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                ) : (
                  <p>{t("noDescription")}</p>
                )}
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="max-w-2xl">
                {specTableRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-start text-sm">
                      <tbody className="divide-y divide-border">
                        {specTableRows.map((row, idx) => (
                          <tr key={idx} className="even:bg-secondary/40">
                            <td className="w-1/3 px-4 py-3 font-semibold text-foreground">{row.label}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noSpecifications")}</p>
                )}
              </div>
            )}

            {activeTab === "compatibility" && (
              <div className="max-w-2xl">
                {product.fits_all_vehicles ? (
                  <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <p className="text-sm font-medium text-foreground">{t("universalFit")}</p>
                  </div>
                ) : product.compatible_vehicles.length > 0 ? (
                  <div className="divide-y divide-border rounded-lg border">
                    {product.compatible_vehicles.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <span className="font-semibold text-foreground">
                          {v.make} {v.model}
                          {v.chassis_code ? ` (${v.chassis_code})` : ""}
                        </span>
                        <span className="text-muted-foreground">
                          {v.year_from === v.year_to ? v.year_from : `${v.year_from}–${v.year_to}`}
                          {v.vin_note ? ` · ${v.vin_note}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noCompatibilityData")}</p>
                )}
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <Truck className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{t("shippingInfoTitle")}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{t("shippingInfoBody")}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <RotateCcw className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{t("returnsInfoTitle")}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{t("returnsInfoBody")}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{t("paymentInfoTitle")}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{t("paymentInfoBody")}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-foreground">{product.rating.toFixed(1)}</div>
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-warning text-warning" : "text-muted"}`} />
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{t("reviewsCount", { count: product.reviews })}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 border-t pt-16">
            <div className="mb-8 flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              You Might Also Like
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
      {flyPortal}
    </div>
  );
}
