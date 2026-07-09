"use client";

import { Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Users } from "lucide-react";
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
import type { PaginatedResponse } from "@/types/api";
import type { Customer } from "@/mocks/admin/db";

const columns: ColumnDef<Customer, any>[] = [
  {
    accessorKey: "name",
    header: "Customer",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-ink">{row.original.name}</p>
        <p className="text-caption text-ink-muted">{row.original.email}</p>
      </div>
    ),
  },
  { accessorKey: "phone", header: "Phone" },
  { accessorKey: "orders_count", header: "Orders" },
  { accessorKey: "total_spent", header: "Total Spent", cell: ({ row }) => formatAED(row.original.total_spent) },
  { accessorKey: "created_at", header: "Joined", cell: ({ row }) => formatDate(row.original.created_at) },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

function AdminCustomersPageContent() {
  const router = useRouter();
  const dt = useDataTable({ defaultPageSize: 20 });
  const status = dt.getFilter("status");
  const hasOrders = dt.getFilter("has_orders");

  const filters = useMemo(
    () => ({
      search: dt.search || undefined,
      status: status || undefined,
      has_orders: hasOrders || undefined,
      page: dt.page,
      per_page: dt.pageSize,
    }),
    [dt.search, status, hasOrders, dt.page, dt.pageSize]
  );

  const customersQuery = useAdminQuery<PaginatedResponse<Customer>>(
    adminQueryKeys.customers.list(filters),
    "/customers",
    filters
  );

  return (
    <div>
      <PageHeader title="Customers" description={`${customersQuery.data?.meta.total ?? "…"} registered customers`} />

      <DataTable
        columns={columns}
        data={customersQuery.data?.items ?? []}
        isLoading={customersQuery.isLoading}
        getRowId={(c) => String(c.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={customersQuery.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        onRowClick={(customer) => router.push(`/admin/customers/${customer.id}`)}
        toolbar={
          <FilterBar
            chips={[
              ...(hasOrders
                ? [
                    {
                      key: "has_orders",
                      label: hasOrders === "true" ? "Has orders" : "No orders",
                      onRemove: () => dt.setFilter("has_orders", null),
                    },
                  ]
                : []),
            ]}
            onClearAll={() => dt.clearFilters(["has_orders"])}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Search by name or email…"
                defaultValue={dt.search}
                onChange={(e) => dt.setSearch(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <Select value={status} onChange={(e) => dt.setFilter("status", e.target.value || null)} className="w-36">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </Select>
            <Select value={hasOrders} onChange={(e) => dt.setFilter("has_orders", e.target.value || null)} className="w-40">
              <option value="">Has orders / no orders</option>
              <option value="true">Has orders</option>
              <option value="false">No orders</option>
            </Select>
          </FilterBar>
        }
        emptyState={{ icon: Users, title: "No customers found", message: "Try adjusting your search or filters." }}
      />
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminCustomersPageContent />
    </Suspense>
  );
}
