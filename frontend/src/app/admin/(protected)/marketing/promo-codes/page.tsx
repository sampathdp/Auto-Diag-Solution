"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Plus, Percent } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { Button } from "@/components/admin/ui/Button";
import { FilterBar } from "@/components/admin/FilterBar";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { actionsColumn } from "@/components/admin/columns";
import { defaultRowActions } from "@/components/admin/ActionsMenu";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { PromoCodeDrawerForm } from "@/components/admin/marketing/PromoCodeDrawerForm";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED } from "@/lib/admin/utils";
import type { PaginatedResponse } from "@/types/api";
import type { PromoCode } from "@/types/promoCode";

function AdminPromoCodesPageContent() {
  const router = useRouter();
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "created_at", desc: true } });
  const status = dt.getFilter("status");
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);

  const filters = {
    search: dt.search || undefined,
    status: status || undefined,
    page: dt.page,
    per_page: dt.pageSize,
    sort_by: dt.sorting[0]?.id,
    sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
  };

  const promoQuery = useAdminQuery<PaginatedResponse<PromoCode>>(adminQueryKeys.promoCodes.list(filters), "/promo-codes", filters);
  const promoCodes = promoQuery.data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.promoCodes.all });

  const deletePromo = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/promo-codes/${id}`),
    onSuccess: () => {
      showSuccess("Promo code deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      showError(err instanceof ApiError ? err.message : "Could not delete the promo code.");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<PromoCode, any>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-semibold text-ink">{row.original.code}</p>
          <p className="text-caption text-ink-muted">{row.original.sales_rep_name ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "discount",
      header: "Discount",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.discount_type === "percentage" ? `${row.original.discount_value}%` : formatAED(row.original.discount_value),
    },
    {
      id: "commission",
      header: "Commission",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.commission_type === "percentage" ? `${row.original.commission_value}%` : formatAED(row.original.commission_value),
    },
    {
      id: "usage",
      header: "Usage",
      accessorKey: "used_count",
      cell: ({ row }) => `${row.original.used_count}${row.original.usage_limit ? ` / ${row.original.usage_limit}` : ""}`,
    },
    {
      accessorKey: "expiry_date",
      header: "Expires",
      cell: ({ row }) => row.original.expiry_date ?? "Never",
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    actionsColumn<PromoCode>((promo) =>
      defaultRowActions({
        onView: () => router.push(`/admin/marketing/promo-codes/${promo.id}`),
        onEdit: () => {
          setEditingPromo(promo);
          setDrawerOpen(true);
        },
        onDelete: () => setDeleteTarget(promo),
      })
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Promo Codes"
        description={`${promoQuery.data?.meta.total ?? "…"} promo codes`}
        actions={
          <Button
            onClick={() => {
              setEditingPromo(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Promo Code
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={promoCodes}
        isLoading={promoQuery.isLoading}
        getRowId={(p) => String(p.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={promoQuery.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        sorting={dt.sorting}
        onSortingChange={dt.setSorting}
        onRowClick={(promo) => router.push(`/admin/marketing/promo-codes/${promo.id}`)}
        toolbar={
          <FilterBar chips={[]} onClearAll={() => dt.clearFilters(["status"])}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Search by code…"
                defaultValue={dt.search}
                onChange={(e) => dt.setSearch(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <Select value={status} onChange={(e) => dt.setFilter("status", e.target.value || null)} className="w-36">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FilterBar>
        }
        emptyState={{ icon: Percent, title: "No promo codes found", message: "Create a promo code and assign it to a sales representative." }}
      />

      <PromoCodeDrawerForm open={drawerOpen} onClose={() => setDrawerOpen(false)} promo={editingPromo} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deletePromo.mutate(deleteTarget.id)}
        itemName={deleteTarget?.code ?? ""}
        itemLabel="promo code"
        extraWarning={
          deleteTarget && deleteTarget.used_count > 0
            ? "This code has already been used on real orders and cannot be deleted — deactivate it instead."
            : undefined
        }
        loading={deletePromo.isPending}
      />
    </div>
  );
}

export default function AdminPromoCodesPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminPromoCodesPageContent />
    </Suspense>
  );
}
