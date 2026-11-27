"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileSpreadsheet, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Input } from "@/components/admin/ui/Input";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDateTime } from "@/lib/admin/utils";
import { cn } from "@/lib/utils";
import type { AdminQuotationListItem, Paginated, QuotationStatus } from "@/types/quotation";

interface Tab {
  status: string;
  label: string;
  statuses: QuotationStatus[];
}

const TABS: Tab[] = [
  { status: "needs_action", label: "Needs action", statuses: ["submitted", "under_review"] },
  { status: "open", label: "In progress", statuses: ["submitted", "under_review", "discussion_required", "revised", "approved"] },
  { status: "discussion_required", label: "Waiting for dealer", statuses: ["discussion_required"] },
  { status: "approved", label: "Sent to dealer", statuses: ["approved"] },
  { status: "converted", label: "Converted", statuses: ["converted"] },
  { status: "all", label: "All", statuses: ["submitted", "under_review", "discussion_required", "revised", "approved", "rejected", "expired", "converted", "cancelled"] },
];

function AdminQuotationsList() {
  const router = useRouter();
  const params = useSearchParams();
  const dealerId = params.get("dealer_id") ?? undefined;
  const [status, setStatus] = useState(dealerId ? "all" : TABS[0].status);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filters = { status, search: search || undefined, dealer_id: dealerId, page, per_page: pageSize };
  const query = useAdminQuery<Paginated<AdminQuotationListItem>>(adminQueryKeys.b2bQuotations.list(filters), "/b2b/quotations", filters);
  const counts = query.data?.counts ?? {};
  const countFor = (tab: Tab) => tab.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  const columns: ColumnDef<AdminQuotationListItem, any>[] = [
    {
      accessorKey: "quotation_number",
      header: "Quotation",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-mono font-medium text-ink">{row.original.quotation_number}</p>
          <p className="text-caption text-ink-muted">
            v{row.original.current_version} · {row.original.item_count} {Number(row.original.item_count) === 1 ? "line" : "lines"}
            {Number(row.original.is_first_order) === 1 ? " · first order" : ""}
          </p>
        </div>
      ),
    },
    {
      id: "dealer",
      header: "Dealer",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.business_name ?? "—"}</p>
          <p className="truncate font-mono text-caption text-ink-muted">{row.original.dealer_code}</p>
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      enableSorting: false,
      cell: ({ row }) => <span className="font-mono tabular-nums">AED {Number(row.original.total).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>,
    },
    {
      id: "dates",
      header: "Updated",
      enableSorting: false,
      cell: ({ row }) => (
        <div>
          <p className="text-body text-ink">{formatDateTime(row.original.updated_at)}</p>
          {row.original.status === "approved" && row.original.expires_at && (
            <p className="text-caption text-ink-muted">expires {formatDateTime(row.original.expires_at)}</p>
          )}
        </div>
      ),
    },
    { accessorKey: "status", header: "Status", enableSorting: false, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Quotations"
        description={
          dealerId
            ? "Quotations for one dealer. Clear the filter to see every dealer."
            : "Dealer quotation requests: check prices and stock, revise, then approve so the dealer can accept."
        }
        actions={
          dealerId ? (
            <button type="button" className="text-body text-primary underline" onClick={() => router.push("/admin/b2b/quotations")}>
              Show all dealers
            </button>
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            role="tab"
            aria-selected={status === tab.status}
            type="button"
            onClick={() => {
              setStatus(tab.status);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-caption font-semibold transition-colors",
              status === tab.status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-ink hover:bg-app"
            )}
          >
            {tab.label}
            <span className={cn("ml-2 tabular-nums", status === tab.status ? "text-primary-foreground/80" : "text-ink-muted")}>{countFor(tab)}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isLoading={query.isLoading}
        getRowId={(r) => String(r.id)}
        page={page}
        pageSize={pageSize}
        total={query.data?.meta.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onRowClick={(r) => router.push(`/admin/b2b/quotations/${r.id}`)}
        toolbar={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              aria-label="Search quotations"
              placeholder="Search number, dealer name, code or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-80 max-w-full pl-10"
            />
          </div>
        }
        emptyState={{
          icon: FileSpreadsheet,
          title: "No quotations here",
          message: "A dealer's first order (or any order from a dealer set to always need a quotation) arrives here as a request.",
        }}
      />
    </div>
  );
}

// useSearchParams needs a Suspense boundary for the static build.
export default function AdminQuotationsPage() {
  return (
    <Suspense fallback={null}>
      <AdminQuotationsList />
    </Suspense>
  );
}
