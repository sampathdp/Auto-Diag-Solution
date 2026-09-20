"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";

export function ProductCarousel({ eyebrow, title }: { eyebrow?: string; title?: string }) {
  const t = useTranslations("home.products");
  const tToast = useTranslations("shop.toasts");
  const locale = useLocale();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const addToCart = useCartStore((state) => state.addItem);

  const { data } = useProducts({ sort: "newest", per_page: 8 });
  const products = data?.data || [];

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  const handleAddToCart = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(productId);
    toast.success(tToast("addedToCart"));
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-14 md:py-28">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-accessible">
              <span className="block h-0.5 w-6 bg-primary" />
              {eyebrow || t("eyebrow")}
            </div>
            <h2 className="mt-4 text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {title || t("title")}
            </h2>
          </div>
          <div className="flex gap-2.5">
            <button
              aria-label="Previous"
              onClick={() => scrollBy(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-foreground hover:text-background"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              aria-label="Next"
              onClick={() => scrollBy(1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-foreground hover:text-background"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-5 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-14"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {products.map((p) => {
          const name = locale === "ar" ? p.name_ar : p.name_en;
          const brandName = p.brand ? (locale === "ar" ? p.brand.name_ar : p.brand.name_en) : "";
          const isOutOfStock = p.stock === 0;
          const isLowStock = !isOutOfStock && p.stock <= 10;
          return (
            <Link
              key={p.id}
              href={`/shop/product/${p.id}` as any}
              className="group w-[260px] flex-none overflow-hidden rounded-lg bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lifted"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#F5F6F8]">
                <span
                  aria-hidden
                  className="absolute start-4 top-4 z-10 h-3.5 w-3.5 border-s-2 border-t-2 border-foreground/15"
                />
                <img
                  src={p.images[0] || "/placeholder-product.svg"}
                  alt={name}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-contain p-6 ${isOutOfStock ? "opacity-50 grayscale" : ""}`}
                />
                <span
                  className={`absolute start-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    isOutOfStock
                      ? "border-destructive text-destructive"
                      : isLowStock
                        ? "border-primary-accessible text-primary-accessible"
                        : "border-border text-foreground/62"
                  } bg-card`}
                >
                  {isOutOfStock ? t("outOfStock") : isLowStock ? t("lowStock") : t("inStock")}
                </span>
                {!isOutOfStock && (
                  <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    <Button size="sm" className="w-full" onClick={(e) => handleAddToCart(e, p.id)}>
                      {t("addToCart")}
                    </Button>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-foreground/62">
                  {brandName}
                </div>
                <div className="mt-1.5 line-clamp-1 text-[15px] font-bold leading-snug">{name}</div>
                <div className="mt-1.5 font-mono text-[11px] tabular-nums text-foreground/62">{p.sku}</div>
                <div className="mt-3.5 flex items-baseline justify-between">
                  <div className="text-lg font-extrabold text-foreground">
                    <span className="me-1 text-xs font-bold text-foreground/62">AED</span>
                    {p.price_aed.toLocaleString()}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
