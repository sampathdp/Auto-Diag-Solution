"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Plus, Package, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Input } from "@/components/admin/ui/Input";
import { Button } from "@/components/admin/ui/Button";
import { Select } from "@/components/admin/ui/Select";
import { FilterBar } from "@/components/admin/FilterBar";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { actionsColumn, currencyColumn } from "@/components/admin/columns";
import { defaultRowActions } from "@/components/admin/ActionsMenu";
import { showError, showInfo, showSuccess } from "@/components/admin/ui/toast";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED } from "@/lib/admin/utils";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Category } from "@/mocks/admin/db";
import type { Product } from "@/types/product";

const STATUS_CHIPS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
];

const STOCK_OPTIONS = [
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

function AdminProductsPageContent() {
  const router = useRouter();
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "name_en", desc: false } });
  const status = dt.getFilter("status");
  const categoryId = dt.getFilter("category_id");
  const stock = dt.getFilter("stock");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Real backend filter params: stock_status (in_stock/out_of_stock, a direct enum
  // match) and low_stock (a computed condition, not a stored value — see
  // ProductRepository::buildWhere()) are two different params, not one "stock"
  // value like the mock modeled it. sort_by/sort_dir (not sort/order) match every
  // other admin list endpoint's convention.
  const filters = useMemo(
    () => ({
      search: dt.search || undefined,
      status: status || undefined,
      category_id: categoryId || undefined,
      stock_status: stock === "in_stock" || stock === "out_of_stock" ? stock : undefined,
      low_stock: stock === "low_stock" ? 1 : undefined,
      page: dt.page,
      per_page: dt.pageSize,
      sort_by: dt.sorting[0]?.id,
      sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
    }),
    [dt.search, status, categoryId, stock, dt.page, dt.pageSize, dt.sorting]
  );

  const queryClient = useQueryClient();
  const productsQuery = useAdminQuery<PaginatedResponse<Product>>(
    adminQueryKeys.products.list(filters),
    "/products",
    filters
  );
  const categoriesQuery = useAdminQuery<PaginatedResponse<Category>>(
    adminQueryKeys.categories.all,
    "/categories",
    { per_page: 100 }
  );
  const mediaQuery = useAdminQuery<PaginatedResponse<RawMediaRow>>(
    adminQueryKeys.media.list({ per_page: 100 }),
    "/media",
    { per_page: 100 }
  );

  const categoryById = useMemo(
    () => new Map((categoriesQuery.data?.items ?? []).map((c) => [c.id, c])),
    [categoriesQuery.data]
  );
  const mediaById = useMemo(
    () => new Map((mediaQuery.data?.items ?? []).map(toMediaItem).map((m) => [m.id, m])),
    [mediaQuery.data]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.products.list() });

  // Read-only on Fulfillor's side: pulls warehouse stock for linked products now
  // instead of waiting for the scheduled fulfillor:sync run.
  const syncStock = useMutation({
    mutationFn: () =>
      adminApi.post<{ checked: number; updated: number; skipped?: string }>("/fulfillor/sync-stock"),
    onSuccess: (result) => {
      showSuccess(
        result.skipped
          ? `Stock sync skipped: ${result.skipped}`
          : `Stock synced from 3PL — ${result.updated} of ${result.checked} linked product(s) changed`
      );
      invalidate();
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => adminApi.delete<{ fulfillor_product_id: string | null } | null>(`/products/${id}`),
    onSuccess: (data) => {
      showSuccess("Product deleted");
      // Fulfillor's API has no product delete — the admin has to remove it there by hand.
      if (data?.fulfillor_product_id) {
        showInfo(`Still in Fulfillor as product ${data.fulfillor_product_id} — remove it in the Fulfillor dashboard.`);
      }
      setDeleteTarget(null);
      invalidate();
    },
  });

  // No dedicated bulk backend endpoint exists — fans out to the real single-row
  // PUT/DELETE endpoint per id in parallel instead, the same working pattern
  // already used for Media's bulk delete (Phase F4). This is a real, fully
  // functional implementation, not a mock-shaped stand-in.
  // Pushes existing products to Fulfillor (creates them there, or links by SKU) and
  // marks them source='3pl' so later edits keep syncing. Writes to the live 3PL account.
  type SendResult = { sent: number; failed: number; results: { id: number; sku: string; ok: boolean; error: string | null }[] };
  const sendToFulfillor = useMutation({
    mutationFn: (ids: number[]) => adminApi.post<SendResult>("/fulfillor/send-products", { ids }),
    onSuccess: (result) => {
      if (result.sent > 0) showSuccess(`Sent ${result.sent} product(s) to 3PL`);
      const failures = result.results.filter((r) => !r.ok);
      if (failures.length > 0) {
        showError(
          `${failures.length} failed — ` +
            failures
              .slice(0, 3)
              .map((f) => `${f.sku || `#${f.id}`}: ${f.error}`)
              .join("; ") +
            (failures.length > 3 ? "…" : "")
        );
      }
      invalidate();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not send products to 3PL."),
  });

  const bulkAction = useMutation({
    mutationFn: (payload: { action: "delete" | "activate" | "deactivate"; ids: number[] }) =>
      Promise.all(
        payload.ids.map((id) =>
          payload.action === "delete"
            ? adminApi.delete<{ fulfillor_product_id: string | null } | null>(`/products/${id}`)
            : adminApi.put(`/products/${id}`, { status: payload.action === "activate" ? "active" : "inactive" })
        )
      ),
    onSuccess: (data, variables) => {
      if (variables.action === "delete") {
        const stillInFulfillor = (data as ({ fulfillor_product_id?: string | null } | null)[]).filter((d) => d?.fulfillor_product_id).length;
        if (stillInFulfillor > 0) {
          showInfo(`${stillInFulfillor} deleted product(s) still exist in Fulfillor — remove them in the Fulfillor dashboard.`);
        }
      }
      showSuccess(
        variables.action === "delete"
          ? "Products deleted"
          : `Products ${variables.action === "activate" ? "activated" : "deactivated"}`
      );
      invalidate();
    },
  });

  const columns: ColumnDef<Product, any>[] = [
    {
      id: "thumbnail",
      header: "",
      enableSorting: false,
      cell: ({ row }) => <MediaThumbnail item={mediaById.get(row.original.images[0])} size="sm" />,
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-caption text-ink">{row.original.sku}</span>,
    },
    {
      accessorKey: "name_en",
      header: "Product",
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
      id: "category",
      header: "Category",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-body text-ink-muted">
          {categoryById.get(row.original.category_id ?? -1)?.name_en ?? "—"}
        </span>
      ),
    },
    {
      id: "brand",
      header: "Brand",
      enableSorting: false,
      cell: ({ row }) => <span className="text-body text-ink-muted">{row.original.brand_name_en ?? "—"}</span>,
    },
    currencyColumn<Product>("price", "Price"),
    {
      accessorKey: "stock_quantity",
      header: "Stock",
      cell: ({ row }) => (
        <span className={row.original.stock_quantity === 0 ? "font-semibold text-danger" : ""}>
          {row.original.track_inventory ? row.original.stock_quantity : "∞"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const p = row.original;
        const display =
          p.status === "active" && p.track_inventory && p.stock_quantity === 0 ? "out_of_stock" : p.status;
        return <StatusBadge status={display} />;
      },
    },
    actionsColumn<Product>((product) =>
      defaultRowActions({
        onEdit: () => router.push(`/admin/products/${product.id}/edit`),
        onDelete: () => setDeleteTarget(product),
      })
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${productsQuery.data?.meta.total ?? "…"} products in catalog`}
        actions={
          <>
            <Button variant="secondary" onClick={() => syncStock.mutate()} loading={syncStock.isPending}>
              <RefreshCw className="h-4 w-4" />
              Sync Stock from 3PL
            </Button>
            <Button onClick={() => router.push("/admin/products/new")}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={productsQuery.data?.items ?? []}
        isLoading={productsQuery.isLoading}
        getRowId={(p) => String(p.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={productsQuery.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        sorting={dt.sorting}
        onSortingChange={dt.setSorting}
        selectable
        bulkActions={(rows, clear) => (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulkAction.mutate({ action: "activate", ids: rows.map((r) => r.id) }, { onSuccess: clear })}
              loading={bulkAction.isPending}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulkAction.mutate({ action: "deactivate", ids: rows.map((r) => r.id) }, { onSuccess: clear })}
              loading={bulkAction.isPending}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (window.confirm(`Send ${rows.length} product(s) to Fulfillor (live 3PL account)? Each is created there, or linked if the SKU already exists, and future edits will sync automatically.`)) {
                  sendToFulfillor.mutate(rows.map((r) => r.id), { onSuccess: clear });
                }
              }}
              loading={sendToFulfillor.isPending}
            >
              Send to 3PL
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => bulkAction.mutate({ action: "delete", ids: rows.map((r) => r.id) }, { onSuccess: clear })}
              loading={bulkAction.isPending}
            >
              Delete
            </Button>
          </>
        )}
        toolbar={
          <div className="flex w-full flex-col gap-3">
            <FilterBar
              chips={[
                ...(categoryId
                  ? [
                      {
                        key: "category",
                        label: `Category: ${categoryById.get(Number(categoryId))?.name_en ?? categoryId}`,
                        onRemove: () => dt.setFilter("category_id", null),
                      },
                    ]
                  : []),
                ...(stock
                  ? [
                      {
                        key: "stock",
                        label: `Stock: ${STOCK_OPTIONS.find((o) => o.value === stock)?.label}`,
                        onRemove: () => dt.setFilter("stock", null),
                      },
                    ]
                  : []),
              ]}
              onClearAll={() => dt.clearFilters(["category_id", "stock"])}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  placeholder="Search by name or SKU…"
                  defaultValue={dt.search}
                  onChange={(e) => dt.setSearch(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
              <Select
                value={categoryId}
                onChange={(e) => dt.setFilter("category_id", e.target.value || null)}
                className="w-48"
              >
                <option value="">All categories</option>
                {(categoriesQuery.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `— ${c.name_en}` : c.name_en}
                  </option>
                ))}
              </Select>
              <Select value={stock} onChange={(e) => dt.setFilter("stock", e.target.value || null)} className="w-40">
                <option value="">All stock levels</option>
                {STOCK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FilterBar>

            <div className="flex items-center gap-2">
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
        emptyState={{
          icon: Package,
          title: "No products found",
          message: "Try adjusting your search or filters.",
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteProduct.mutate(deleteTarget.id)}
        itemName={deleteTarget?.name_en ?? ""}
        itemLabel="product"
        loading={deleteProduct.isPending}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminProductsPageContent />
    </Suspense>
  );
}
