"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Plus, UserCheck } from "lucide-react";
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
import { SalesRepDrawerForm } from "@/components/admin/marketing/SalesRepDrawerForm";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import type { PaginatedResponse } from "@/types/api";
import type { SalesRep } from "@/types/salesRep";

function AdminSalesRepsPageContent() {
  const router = useRouter();
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "name", desc: false } });
  const status = dt.getFilter("status");
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesRep | null>(null);

  const filters = {
    search: dt.search || undefined,
    status: status || undefined,
    page: dt.page,
    per_page: dt.pageSize,
    sort_by: dt.sorting[0]?.id,
    sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
  };

  const repsQuery = useAdminQuery<PaginatedResponse<SalesRep>>(adminQueryKeys.salesReps.list(filters), "/sales-representatives", filters);
  const reps = repsQuery.data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.salesReps.all });

  const deleteRep = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/sales-representatives/${id}`),
    onSuccess: () => {
      showSuccess("Sales representative deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      showError(err instanceof ApiError ? err.message : "Could not delete the representative.");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<SalesRep, any>[] = [
    {
      accessorKey: "name",
      header: "Representative",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.name}</p>
          <p className="text-caption text-ink-muted">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
    {
      id: "commission",
      header: "Commission",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.commission_type === "percentage"
          ? `${row.original.commission_value}%`
          : `AED ${row.original.commission_value.toFixed(2)}`,
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    actionsColumn<SalesRep>((rep) =>
      defaultRowActions({
        onView: () => router.push(`/admin/marketing/sales-representatives/${rep.id}`),
        onEdit: () => {
          setEditingRep(rep);
          setDrawerOpen(true);
        },
        onDelete: () => setDeleteTarget(rep),
      })
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Sales Representatives"
        description={`${repsQuery.data?.meta.total ?? "…"} representatives`}
        actions={
          <Button
            onClick={() => {
              setEditingRep(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Representative
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={reps}
        isLoading={repsQuery.isLoading}
        getRowId={(r) => String(r.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={repsQuery.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        sorting={dt.sorting}
        onSortingChange={dt.setSorting}
        onRowClick={(rep) => router.push(`/admin/marketing/sales-representatives/${rep.id}`)}
        toolbar={
          <FilterBar chips={[]} onClearAll={() => dt.clearFilters(["status"])}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Search by name, email, or phone…"
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
        emptyState={{ icon: UserCheck, title: "No sales representatives found", message: "Add a representative to start assigning promo codes." }}
      />

      <SalesRepDrawerForm open={drawerOpen} onClose={() => setDrawerOpen(false)} rep={editingRep} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRep.mutate(deleteTarget.id)}
        itemName={deleteTarget?.name ?? ""}
        itemLabel="sales representative"
        loading={deleteRep.isPending}
      />
    </div>
  );
}

export default function AdminSalesRepsPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminSalesRepsPageContent />
    </Suspense>
  );
}
