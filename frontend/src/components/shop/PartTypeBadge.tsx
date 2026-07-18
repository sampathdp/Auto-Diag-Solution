"use client";

import { useTranslations } from "next-intl";

type PartType = "genuine" | "aftermarket" | "oem";

const PART_TYPE_STYLES: Record<PartType, string> = {
  genuine: "bg-success/10 text-success",
  aftermarket: "bg-info/10 text-info",
  oem: "bg-warning/10 text-warning",
};

export function PartTypeBadge({ type, className = "" }: { type: PartType; className?: string }) {
  const t = useTranslations("shop.quickView");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${PART_TYPE_STYLES[type]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(`partType.${type}`)}
    </span>
  );
}
