"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";

/**
 * A cart/checkout line total. For a dealer it shows the wholesale total with the retail
 * total struck through, or a hint when a few more units would unlock the dealer price.
 * Everyone else sees exactly the plain retail total.
 */
export function CartLinePrice({
  retail,
  unitPrice,
  quantity,
  wholesale,
  minQtyForWholesale,
  className = "text-lg font-extrabold text-foreground",
}: {
  retail: number;
  unitPrice: number;
  quantity: number;
  wholesale: boolean;
  minQtyForWholesale: number | null;
  className?: string;
}) {
  const t = useTranslations("dealerPrice");
  const total = unitPrice * quantity;

  return (
    <div className="text-end">
      {wholesale && (
        <div className="text-xs text-muted-foreground line-through">AED {(retail * quantity).toLocaleString()}</div>
      )}
      <div className={className}>AED {total.toLocaleString()}</div>
      {wholesale && (
        <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-success">
          <BadgeCheck className="h-3 w-3" aria-hidden />
          {t("label")}
        </div>
      )}
      {minQtyForWholesale != null && (
        <div className="mt-0.5 text-[11px] font-semibold text-success">{t("addMore", { count: minQtyForWholesale - quantity })}</div>
      )}
    </div>
  );
}
