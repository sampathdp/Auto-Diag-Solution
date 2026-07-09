"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Filter,
  Disc,
  Gauge,
  Cog,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Product {
  brand: string;
  name: string;
  sku: string;
  price: number;
  lowStock?: boolean;
  image: string;
}

const PRODUCTS: Product[] = [
  { brand: "Bosch", name: "Lambda Oxygen Sensor", sku: "BSH-0258006537", price: 245, image: "/prod-sensor.png" },
  { brand: "NGK", name: "Iridium Spark Plug — Set of 4", sku: "NGK-94702", price: 189, image: "/prod-sparkplug.png" },
  { brand: "Denso", name: "Cabin Air Filter", sku: "DEN-454300", price: 65, image: "/prod-cabinfilter.png" },
  { brand: "Brembo", name: "Front Brake Pad Set", sku: "BRM-P85020", price: 320, lowStock: true, image: "/prod-brakepads.png" },
  { brand: "KYB", name: "Front Shock Absorber", sku: "KYB-334413", price: 410, image: "/prod-shock.png" },
  { brand: "Mann-Filter", name: "Oil Filter", sku: "MNN-W610", price: 38, image: "/prod-oilfilter.png" },
];

function iconForProduct(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("sensor")) return Activity;
  if (n.includes("spark")) return Zap;
  if (n.includes("filter")) return Filter;
  if (n.includes("brake")) return Disc;
  if (n.includes("shock") || n.includes("suspension")) return Gauge;
  return Cog;
}

export function ProductCarousel() {
  const t = useTranslations("home.products");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <section className="bg-background py-14 md:py-28">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("eyebrow")}
            </div>
            <h2 className="mt-4 text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {t("title")}
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
        {PRODUCTS.map((p) => {
          const Icon = iconForProduct(p.name);
          return (
            <div
              key={p.sku}
              className="group w-[260px] flex-none overflow-hidden rounded-lg bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lifted"
              style={{ scrollSnapAlign: "start" }}
            >
              <div
                className="relative flex aspect-square items-center justify-center overflow-hidden bg-white bg-cover bg-center"
                style={{ backgroundImage: `url('${p.image}')` }}
              >
                <span
                  aria-hidden
                  className="absolute start-4 top-4 h-3.5 w-3.5 border-s-2 border-t-2 border-foreground/15"
                />
                <span
                  className={`absolute start-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    p.lowStock ? "border-primary text-primary" : "border-border text-foreground/62"
                  } bg-card`}
                >
                  {p.lowStock ? t("lowStock") : t("inStock")}
                </span>
                <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                  <Button size="sm" className="w-full">
                    {t("addToCart")}
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-foreground/62">
                  {p.brand}
                </div>
                <div className="mt-1.5 text-[15px] font-bold leading-snug">{p.name}</div>
                <div className="mt-1.5 font-mono text-[11px] tabular-nums text-foreground/62">{p.sku}</div>
                <div className="mt-3.5 flex items-baseline justify-between">
                  <div className="text-lg font-extrabold text-foreground">
                    <span className="me-1 text-xs font-bold text-foreground/62">AED</span>
                    {p.price}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
