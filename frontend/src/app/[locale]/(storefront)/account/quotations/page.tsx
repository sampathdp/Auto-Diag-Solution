"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { QuotationStatusPill } from "@/components/account/QuotationStatusPill";
import apiClient from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { DealerQuotationListItem, Paginated } from "@/types/quotation";

const FILTERS = ["all", "open", "approved", "converted"] as const;

export default function QuotationsPage() {
  const t = useTranslations("quotations");
  const format = useFormatter();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["dealer-quotations", status, page],
    queryFn: async () =>
      (await apiClient.get(`/account/dealer/quotations?status=${status}&page=${page}&per_page=10`)).data.data as Paginated<DealerQuotationListItem>,
  });
  const items = query.data?.items ?? [];
  const totalPages = query.data?.meta.total_pages ?? 1;
  const date = (v: string) => format.dateTime(new Date(v.replace(" ", "T")), { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <AccountPageHeader title={t("listTitle")} subtitle={t("listSubtitle")} />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={status === f}
            onClick={() => {
              setStatus(f);
              setPage(1);
            }}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              status === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">{t("emptyTitle")}</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((q) => (
            <li key={q.id}>
              <Link
                href={`/account/quotations/${q.id}` as any}
                className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">{q.quotation_number}</span>
                    <QuotationStatusPill status={q.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("itemCount", { count: Number(q.item_count) })}
                    {" · "}
                    {t("version", { number: q.current_version })}
                    {q.submitted_at ? ` · ${t("submittedOn", { date: date(q.submitted_at) })}` : ""}
                  </p>
                  {q.status === "approved" && q.expires_at && (
                    <p className="mt-1 text-xs font-semibold text-primary">{t("validUntil", { date: date(q.expires_at) })}</p>
                  )}
                  {q.converted_order_number && (
                    <p className="mt-1 text-xs font-semibold text-foreground">{t("orderRef", { number: q.converted_order_number })}</p>
                  )}
                </div>
                <p className="shrink-0 text-lg font-extrabold text-foreground" dir="ltr">
                  {q.currency} {Number(q.total).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
            className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
            className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
