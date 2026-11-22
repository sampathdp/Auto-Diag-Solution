"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Handshake } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Input } from "@/components/admin/ui/Input";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDateTime } from "@/lib/admin/utils";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPE_LABEL, type AdminDealerList, type AdminDealerListItem, type DealerStatus } from "@/types/dealer";

interface Tab {
  view: string;
  label: string;
  statuses: DealerStatus[];
}

const APPLICATION_TABS: Tab[] = [
  { view: "open", label: "Needs review", statuses: ["pending_review", "under_review"] },
  { view: "pending_review", label: "New", statuses: ["pending_review"] },
  { view: "under_review", label: "Under review", statuses: ["under_review"] },
  { view: "rejected", label: "Rejected", statuses: ["rejected"] },
  { view: "draft", label: "Not submitted", statuses: ["draft"] },
  { view: "applications", label: "All submitted", statuses: ["pending_review", "under_review", "approved", "rejected", "suspended"] },
];

const DEALER_TABS: Tab[] = [
  { view: "dealers", label: "All dealers", statuses: ["approved", "suspended"] },
  { view: "approved", label: "Active", statuses: ["approved"] },
  { view: "suspended", label: "Suspended", statuses: ["suspended"] },
];

export function DealerList({ mode }: { mode: "applications" | "dealers" }) {
  const router = useRouter();
  const tabs = mode === "applications" ? APPLICATION_TABS : DEALER_TABS;
  const [view, setView] = useState(tabs[0].view);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filters = { view, search: search || undefined, page, per_page: pageSize };
  const query = useAdminQuery<AdminDealerList>(adminQueryKeys.b2bDealers.list(filters), "/b2b/dealers", filters);
  const counts = query.data?.counts ?? {};
  const countFor = (tab: Tab) => tab.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  const columns: ColumnDef<AdminDealerListItem, any>[] = [
    {
      accessorKey: "business_name",
      header: "Business",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.business_name ?? "Unnamed business"}</p>
          <p className="truncate text-caption text-ink-muted">
            {row.original.business_type ? BUSINESS_TYPE_LABEL[row.original.business_type] ?? row.original.business_type : "—"}
            {row.original.emirate ? ` · ${row.original.emirate}` : ""}
          </p>
        </div>
      ),
    },
    mode === "dealers"
      ? { accessorKey: "dealer_code", header: "Dealer code", enableSorting: false, cell: ({ row }) => <span className="font-mono">{row.original.dealer_code}</span> }
      : { accessorKey: "trade_licence_number", header: "Trade licence", enableSorting: false, cell: ({ row }) => <span className="font-mono">{row.original.trade_licence_number ?? "—"}</span> },
    {
      id: "contact",
      header: "Contact",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-body text-ink">{row.original.business_email ?? row.original.user_email}</p>
          <p className="truncate text-caption text-ink-muted">{row.original.business_phone ?? ""}</p>
        </div>
      ),
    },
    mode === "dealers"
      ? {
          id: "credit",
          header: "Credit",
          enableSorting: false,
          cell: ({ row }) =>
            Number(row.original.credit_enabled) === 1
              ? `AED ${Number(row.original.credit_limit ?? 0).toLocaleString("en-AE")} · ${row.original.credit_period_days}d`
              : "Pay per order",
        }
      : {
          accessorKey: "submitted_at",
          header: "Submitted",
          enableSorting: false,
          cell: ({ row }) => (row.original.submitted_at ? formatDateTime(row.original.submitted_at) : "—"),
        },
    { accessorKey: "status", header: "Status", enableSorting: false, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title={mode === "applications" ? "Dealer Applications" : "Approved Dealers"}
        description={
          mode === "applications"
            ? "Review businesses that applied to buy at dealer prices."
            : "Dealers who can see wholesale prices, with their credit terms."
        }
      />

      <div role="tablist" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.view}
            role="tab"
            aria-selected={view === tab.view}
            type="button"
            onClick={() => {
              setView(tab.view);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-caption font-semibold transition-colors",
              view === tab.view ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-ink hover:bg-app"
            )}
          >
            {tab.label}
            <span className={cn("ml-2 tabular-nums", view === tab.view ? "text-primary-foreground/80" : "text-ink-muted")}>{countFor(tab)}</span>
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
        onRowClick={(r) => router.push(`/admin/b2b/dealers/${r.id}`)}
        toolbar={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              aria-label="Search dealers"
              placeholder="Search name, email, phone, licence or dealer code…"
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
          icon: Handshake,
          title: mode === "applications" ? "No applications here" : "No dealers yet",
          message: mode === "applications" ? "New applications appear here as soon as a business submits one." : "Approved applications appear here.",
        }}
      />
    </div>
  );
}
