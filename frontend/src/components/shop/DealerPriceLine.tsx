"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import { useDealerPrice } from "@/hooks/useDealerPricing";

/**
 * Shown under the retail price, only to approved dealers with wholesale access and
 * only for products that have a wholesale price. Renders nothing for everyone else, so
 * it can sit in every product view without changing the retail layout.
 */
export function DealerPriceLine({ productId, size = "sm", className = "" }: { productId: number | string; size?: "sm" | "lg"; className?: string }) {
  const t = useTranslations("dealerPrice");
  const price = useDealerPrice(Number(productId) || undefined);
  if (!price || price.wholesale == null) return null;

  const lg = size === "lg";
  return (
    <div className={`rounded-md border border-success/30 bg-success/10 px-3 ${lg ? "py-2.5" : "py-1.5"} ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wide text-success ${lg ? "text-xs" : "text-[10px]"}`}>
          <BadgeCheck className={lg ? "h-4 w-4" : "h-3 w-3"} aria-hidden />
          {t("label")}
        </span>
        <span className={`font-extrabold tracking-tight text-foreground ${lg ? "text-2xl" : "text-base"}`}>
          AED {price.wholesale.toLocaleString()}
        </span>
        {price.savings_percent != null && price.savings_percent > 0 && (
          <span className={`font-semibold text-success ${lg ? "text-sm" : "text-[11px]"}`}>
            {t("save", { percent: price.savings_percent })}
          </span>
        )}
      </div>
      {price.min_qty > 1 && (
        <p className={`mt-0.5 text-muted-foreground ${lg ? "text-xs" : "text-[10px]"}`}>{t("minQty", { count: price.min_qty })}</p>
      )}
    </div>
  );
}
