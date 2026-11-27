"use client";

import { Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, ShoppingCart, Eye } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Badge } from "@/components/admin/ui/Badge";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { FilterBar } from "@/components/admin/FilterBar";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED, formatDate } from "@/lib/admin/utils";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Order, OrderStatus } from "@/mocks/admin/db";

const STATUS_CHIPS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "pending_verification", label: "Awaiting verification" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "cod", label: "Cash on delivery" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
];

const METHOD_SHORT: Record<string, string> = { cod: "COD", bank_transfer: "Bank transfer", cheque: "Cheque", credit: "Credit", mock: "Test", stripe: "Card" };

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "b2b", label: "Dealer (B2B)" },
];

const columns: ColumnDef<Order, any>[] = [
  { accessorKey: "order_number", header: "Order #" },
  {
    accessorKey: "customer_name",
    header: "Customer",
    cell: ({ row }) =>
      row.original.channel === "b2b" ? (
        <div>
          <p className="flex items-center gap-1.5">
            <Badge variant="info">Dealer</Badge>
            <span className="font-medium text-ink">{row.original.dealer_business_name || row.original.customer_name}</span>
          </p>
          <p className="font-mono text-caption text-ink-muted">{row.original.dealer_code}</p>
        </div>
      ) : (
        row.original.customer_name
      ),
  },
  { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
  {
    id: "items_count",
    header: "Items",
    enableSorting: false,
    cell: ({ row }) => row.original.items_count ?? row.original.items?.reduce((sum, it) => sum + it.quantity, 0) ?? 0,
  },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatAED(row.original.total) },
  {
    accessorKey: "payment_status",
    header: "Payment",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge status={row.original.refund_requested_at ? "refund_requested" : row.original.payment_status} />
        {row.original.payment_method && (
          <span className="text-caption text-ink-muted">{METHOD_SHORT[row.original.payment_method] ?? row.original.payment_method}</span>
        )}
      </div>
    ),
  },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: "__actions",
    header: "",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.id}`}
        className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline"
      >
        <Eye className="h-3.5 w-3.5" />
        View
      </Link>
    ),
  },
];

function AdminOrdersPageContent() {
  const router = useRouter();
  const dt = useDataTable({ defaultPageSize: 20 });
  const status = dt.getFilter("status");
  const paymentStatus = dt.getFilter("payment_status");
  const paymentMethod = dt.getFilter("payment_method");
  const channel = dt.getFilter("channel");
  const dateFrom = dt.getFilter("date_from");
  const dateTo = dt.getFilter("date_to");

  const filters = useMemo(
    () => ({
      search: dt.search || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      payment_method: paymentMethod || undefined,
      channel: channel || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: dt.page,
      per_page: dt.pageSize,
    }),
    [dt.search, status, paymentStatus, paymentMethod, channel, dateFrom, dateTo, dt.page, dt.pageSize]
  );

  const ordersQuery = useAdminQuery<PaginatedResponse<Order>>(adminQueryKeys.orders.list(filters), "/orders", filters);

  return (
    <div>
      <PageHeader title="Orders" description={`${ordersQuery.data?.meta.total ?? "…"} orders`} />

      <DataTable
        columns={columns}
        data={ordersQuery.data?.items ?? []}
        isLoading={ordersQuery.isLoading}
        getRowId={(o) => String(o.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={ordersQuery.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        onRowClick={(order) => router.push(`/admin/orders/${order.id}`)}
        toolbar={
          <div className="flex w-full flex-col gap-3">
            <FilterBar
              chips={[
                ...(paymentStatus
                  ? [{ key: "payment", label: `Payment: ${PAYMENT_STATUS_OPTIONS.find((o) => o.value === paymentStatus)?.label ?? paymentStatus}`, onRemove: () => dt.setFilter("payment_status", null) }]
                  : []),
                ...(paymentMethod
                  ? [{ key: "method", label: `Method: ${PAYMENT_METHOD_OPTIONS.find((o) => o.value === paymentMethod)?.label ?? paymentMethod}`, onRemove: () => dt.setFilter("payment_method", null) }]
                  : []),
                ...(channel
                  ? [{ key: "channel", label: `Channel: ${CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? channel}`, onRemove: () => dt.setFilter("channel", null) }]
                  : []),
                ...(dateFrom || dateTo
                  ? [{ key: "date", label: `${dateFrom || "…"} → ${dateTo || "…"}`, onRemove: () => dt.clearFilters(["date_from", "date_to"]) }]
                  : []),
              ]}
              onClearAll={() => dt.clearFilters(["payment_status", "payment_method", "channel", "date_from", "date_to"])}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  placeholder="Search order #, customer or dealer…"
                  defaultValue={dt.search}
                  onChange={(e) => dt.setSearch(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
              <Input type="date" value={dateFrom} onChange={(e) => dt.setFilter("date_from", e.target.value || null)} className="w-40" />
              <span className="text-caption text-ink-muted">to</span>
              <Input type="date" value={dateTo} onChange={(e) => dt.setFilter("date_to", e.target.value || null)} className="w-40" />
              <Select
                value={paymentStatus}
                onChange={(e) => dt.setFilter("payment_status", e.target.value || null)}
                className="w-40"
              >
                <option value="">All payments</option>
                {PAYMENT_STATUS_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Select
                value={paymentMethod}
                onChange={(e) => dt.setFilter("payment_method", e.target.value || null)}
                className="w-44"
                aria-label="Payment method"
              >
                <option value="">All methods</option>
                {PAYMENT_METHOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Select value={channel} onChange={(e) => dt.setFilter("channel", e.target.value || null)} className="w-40" aria-label="Channel">
                <option value="">All channels</option>
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </FilterBar>

            <div className="flex flex-wrap items-center gap-2">
              {STATUS_CHIPS.map((chip) => {
                const active = status === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => dt.setFilter("status", active ? null : chip.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-ink-muted hover:text-ink"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
        emptyState={{ icon: ShoppingCart, title: "No orders found", message: "Try adjusting your search or filters." }}
      />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminOrdersPageContent />
    </Suspense>
  );
}
