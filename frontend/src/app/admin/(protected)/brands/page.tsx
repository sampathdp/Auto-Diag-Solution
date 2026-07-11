"use client";

import { Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Plus, Tag } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Input } from "@/components/admin/ui/Input";
import { Button } from "@/components/admin/ui/Button";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { actionsColumn } from "@/components/admin/columns";
import { defaultRowActions } from "@/components/admin/ActionsMenu";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { BrandDrawerForm } from "@/components/admin/brands/BrandDrawerForm";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import type { PaginatedResponse } from "@/types/api";
import type { Brand } from "@/types/brand";

function AdminBrandsPageContent() {
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "name_en", desc: false } });
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const filters = {
    search: dt.search || undefined,
    page: dt.page,
    per_page: dt.pageSize,
    sort_by: dt.sorting[0]?.id,
    sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
  };

  const brandsQuery = useAdminQuery<PaginatedResponse<Brand>>(
    adminQueryKeys.brands.list(filters),
    "/brands",
    filters
  );
  const brands = brandsQuery.data?.items ?? [];

  // Invalidating the shorter "all" prefix also matches every brands.list(filters)
  // query key (and the product-form picker's fixed key), so both stay in sync.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.brands.all });

  const deleteBrand = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/brands/${id}`),
    onSuccess: () => {
      showSuccess("Brand deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      showError(err instanceof ApiError ? err.message : "Could not delete the brand.");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<Brand, any>[] = [
    {
      accessorKey: "name_en",
      header: "Brand",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.name_en}</p>
          <p className="text-caption text-ink-muted" dir="rtl">
            {row.original.name_ar}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => <span className="font-mono text-caption text-ink-muted">{row.original.slug}</span>,
    },
    {
      id: "products_count",
      header: "Products",
      enableSorting: false,
      cell: ({ row }) => <span className="text-body text-ink-muted">{row.original.products_count ?? 0}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "inactive"} />,
    },
    actionsColumn<Brand>((brand) =>
      defaultRowActions({
        onEdit: () => {
          setEditingBrand(brand);
          setDrawerOpen(true);
        },
        onDelete: () => setDeleteTarget(brand),
      })
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Brands"
        description={`${brandsQuery.data?.meta.total ?? "…"} brands`}
        actions={
          <Button
            onClick={() => {
              setEditingBrand(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Brand
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={brands}
        isLoading={brandsQuery.isLoading}
        getRowId={(b) => String(b.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={brandsQuery.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        sorting={dt.sorting}
        onSortingChange={dt.setSorting}
        toolbar={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Search brands…"
              defaultValue={dt.search}
              onChange={(e) => dt.setSearch(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
        }
        emptyState={{
          icon: Tag,
          title: "No brands found",
          message: "Create your first brand to start assigning it to products.",
        }}
      />

      <BrandDrawerForm open={drawerOpen} onClose={() => setDrawerOpen(false)} brand={editingBrand} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteBrand.mutate(deleteTarget.id)}
        itemName={deleteTarget?.name_en ?? ""}
        itemLabel="brand"
        extraWarning={
          deleteTarget && (deleteTarget.products_count ?? 0) > 0
            ? "This brand cannot be deleted until its products are reassigned."
            : undefined
        }
        loading={deleteBrand.isPending}
      />
    </div>
  );
}

export default function AdminBrandsPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminBrandsPageContent />
    </Suspense>
  );
}
