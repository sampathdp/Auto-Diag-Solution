"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
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
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/Button";
import { CheckFitmentWidget } from "./CheckFitmentWidget";
import { ProductCard } from "./ProductCard";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useCompareStore } from "@/store/useCompareStore";
import { useCartStore } from "@/store/useCartStore";
import { useRecentlyViewedStore } from "@/store/useRecentlyViewedStore";
import { useFlyToCart } from "@/hooks/useFlyToCart";
import toast from "react-hot-toast";

const WHATSAPP_NUMBER = "971501234567";

export function ProductDetailView({ productId }: { productId: string }) {
  const locale = useLocale();
  const t = useTranslations("shop.quickView");
  const tToast = useTranslations("shop.toasts");

  const { data: product, isLoading } = useProduct(productId);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartState, setCartState] = useState<"idle" | "loading" | "success">("idle");
  const [activeTab, setActiveTab] = useState<"description" | "compatibility" | "shipping" | "reviews">("description");

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

  const { data: relatedData } = useProducts(
    { category: product?.category?.slug, per_page: 5 },
    { enabled: !!product?.category?.slug }
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
  const idHash = product.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const isNew = idHash % 10 > 6;

  const relatedProducts = (relatedData?.data || []).filter((p) => p.id !== product.id).slice(0, 4);

  const specRows = [
    ...(product.brand ? [{ label: t("specBrand"), value: locale === "ar" ? product.brand.name_ar : product.brand.name_en }] : []),
    { label: t("specSku"), value: product.sku },
    ...(product.specifications || []).map((s) => ({
      label: locale === "ar" ? s.key_ar : s.key_en,
      value: locale === "ar" ? s.value_ar : s.value_en,
    })),
    {
      label: t("specCompatibility"),
      value: product.fits_all_vehicles ? t("universalFit") : t("seeFitment", { count: product.compatible_vehicles.length }),
    },
  ];

  const trustItems = [
    { icon: Truck, title: t("fastDelivery"), note: t("fastDeliveryNote") },
    { icon: ShieldCheck, title: t("securePayment"), note: t("securePaymentNote") },
    { icon: RotateCcw, title: t("easyReturns"), note: t("easyReturnsNote") },
  ];

  const tabs = [
    { key: "description" as const, label: t("tabDescription") },
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

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi, I'd like to ask about ${name} (SKU: ${product.sku})`
  )}`;

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
                className={`h-full w-full object-contain p-10 ${isOutOfStock ? "opacity-50 grayscale" : ""}`}
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
                <span className="absolute left-4 top-4 rounded bg-primary px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary-foreground shadow-sm rtl:left-auto rtl:right-4">
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
                    <img src={img} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {product.brand ? (locale === "ar" ? product.brand.name_ar : product.brand.name_en) : ""}
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
              <span className="text-xs font-medium text-muted-foreground uppercase">VAT incl.</span>
            </div>

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

            <div className="mb-6">
              <CheckFitmentWidget product={product} />
            </div>

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
                  className="flex h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-md bg-primary text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-cta transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lifted disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-y-0 sm:text-[13px]"
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
                    isCompared ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground hover:text-primary"
                  }`}
                >
                  <Scale className="h-5 w-5" />
                </button>
              </div>

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

            {/* Trust badges */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-lg border text-center rtl:divide-x-reverse">
              {trustItems.map(({ icon: Icon, title, note }) => (
                <div key={title} className="flex flex-col items-center gap-1.5 px-2 py-4">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">{title}</span>
                  <span className="text-[11px] text-muted-foreground">{note}</span>
                </div>
              ))}
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
