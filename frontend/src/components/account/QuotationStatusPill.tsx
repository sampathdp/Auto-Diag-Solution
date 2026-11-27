"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { QuotationStatus } from "@/types/quotation";

const TONE: Record<QuotationStatus, string> = {
  submitted: "border-border bg-secondary text-foreground",
  under_review: "border-sky-200 bg-sky-50 text-sky-800",
  discussion_required: "border-amber-300 bg-amber-50 text-amber-900",
  revised: "border-sky-200 bg-sky-50 text-sky-800",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  converted: "border-emerald-300 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  expired: "border-border bg-secondary text-muted-foreground",
  cancelled: "border-border bg-secondary text-muted-foreground",
};

export function QuotationStatusPill({ status }: { status: QuotationStatus }) {
  const t = useTranslations("quotations.status");
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", TONE[status] ?? TONE.submitted)}>
      {t(status)}
    </span>
  );
}
