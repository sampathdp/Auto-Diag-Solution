"use client";

import { Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, ShoppingCart, Eye } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
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

const PAYMENT_STATUS_OPTIONS = ["pending", "paid", "failed", "refunded"];

const columns: ColumnDef<Order, any>[] = [
  { accessorKey: "order_number", header: "Order #" },
  { accessorKey: "customer_name", header: "Customer" },
  { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
  {
    id: "items_count",
    header: "Items",
    enableSorting: false,
    cell: ({ row }) => row.original.items.reduce((sum, it) => sum + it.quantity, 0),
  },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatAED(row.original.total) },
  {
    accessorKey: "payment_status",
    header: "Payment",
    cell: ({ row }) => (
      <StatusBadge status={row.original.refund_requested_at ? "refund_requested" : row.original.payment_status} />
    ),
  },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: "__actions",
    header: "",
    cell: () => (
      <span className="inline-flex items-center gap-1 text-caption font-semibold text-primary">
        <Eye className="h-3.5 w-3.5" />
        View
      </span>
    ),
  },
];

function AdminOrdersPageContent() {
  const router = useRouter();
  const dt = useDataTable({ defaultPageSize: 20 });
  const status = dt.getFilter("status");
  const paymentStatus = dt.getFilter("payment_status");
  const dateFrom = dt.getFilter("date_from");
  const dateTo = dt.getFilter("date_to");

  const filters = useMemo(
    () => ({
      search: dt.search || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: dt.page,
      per_page: dt.pageSize,
    }),
    [dt.search, status, paymentStatus, dateFrom, dateTo, dt.page, dt.pageSize]
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
                  ? [{ key: "payment", label: `Payment: ${paymentStatus}`, onRemove: () => dt.setFilter("payment_status", null) }]
                  : []),
                ...(dateFrom || dateTo
                  ? [{ key: "date", label: `${dateFrom || "…"} → ${dateTo || "…"}`, onRemove: () => dt.clearFilters(["date_from", "date_to"]) }]
                  : []),
              ]}
              onClearAll={() => dt.clearFilters(["payment_status", "date_from", "date_to"])}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  placeholder="Search by order # or customer…"
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
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
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
