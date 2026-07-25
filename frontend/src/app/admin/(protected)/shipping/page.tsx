"use client";

import { Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Plus, MapPin, Truck } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Input } from "@/components/admin/ui/Input";
import { Button } from "@/components/admin/ui/Button";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { actionsColumn } from "@/components/admin/columns";
import { defaultRowActions } from "@/components/admin/ActionsMenu";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { DistrictDrawerForm } from "@/components/admin/shipping/DistrictDrawerForm";
import { RateDrawerForm } from "@/components/admin/shipping/RateDrawerForm";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatAED } from "@/lib/admin/utils";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import type { PaginatedResponse } from "@/types/api";
import type { ShippingDistrict, ShippingRate } from "@/types/shipping";

function DistrictsTab() {
  const queryClient = useQueryClient();
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "name", desc: false } });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingDistrict | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingDistrict | null>(null);

  const filters = {
    search: dt.search || undefined,
    page: dt.page,
    per_page: dt.pageSize,
    sort_by: dt.sorting[0]?.id,
    sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
  };

  const query = useAdminQuery<PaginatedResponse<ShippingDistrict>>(
    adminQueryKeys.shipping.districts(filters),
    "/shipping/districts",
    filters
  );
  const districts = query.data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "shipping"] });

  const deleteDistrict = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/shipping/districts/${id}`),
    onSuccess: () => {
      showSuccess("District deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      showError(err instanceof ApiError ? err.message : "Could not delete the district.");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<ShippingDistrict, any>[] = [
    { accessorKey: "name", header: "District" },
    {
      id: "rate",
      header: "Delivery Fee",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.rate !== null ? (
          <span className="text-body text-ink">{formatAED(row.original.rate)}</span>
        ) : (
          <span className="text-caption text-ink-muted">Standard rate</span>
        ),
    },
    {
      id: "free_shipping_threshold",
      header: "Free Over",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.free_shipping_threshold !== null ? (
          <span className="text-body text-ink">{formatAED(row.original.free_shipping_threshold)}</span>
        ) : (
          <span className="text-caption text-ink-muted">—</span>
        ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "inactive"} />,
    },
    actionsColumn<ShippingDistrict>((district) =>
      defaultRowActions({
        onEdit: () => {
          setEditing(district);
          setDrawerOpen(true);
        },
        onDelete: () => setDeleteTarget(district),
      })
    ),
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add District
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={districts}
        isLoading={query.isLoading}
        getRowId={(d) => String(d.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={query.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        sorting={dt.sorting}
        onSortingChange={dt.setSorting}
        toolbar={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Search districts…"
              defaultValue={dt.search}
              onChange={(e) => dt.setSearch(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
        }
        emptyState={{
          icon: MapPin,
          title: "No shipping districts yet",
          message: "Add the delivery zones you charge different rates for.",
        }}
      />

      <DistrictDrawerForm open={drawerOpen} onClose={() => setDrawerOpen(false)} district={editing} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteDistrict.mutate(deleteTarget.id)}
        itemName={deleteTarget?.name ?? ""}
        itemLabel="district"
        extraWarning={
          deleteTarget && (deleteTarget.address_count ?? 0) > 0
            ? `${deleteTarget.address_count} saved customer address${deleteTarget.address_count === 1 ? "" : "es"} use this district — they'll fall back to the standard rate.`
            : undefined
        }
        loading={deleteDistrict.isPending}
      />
    </>
  );
}

function RatesTab() {
  const queryClient = useQueryClient();
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "district_name", desc: false } });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingRate | null>(null);

  const filters = {
    search: dt.search || undefined,
    page: dt.page,
    per_page: dt.pageSize,
    sort_by: dt.sorting[0]?.id,
    sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
  };

  const query = useAdminQuery<PaginatedResponse<ShippingRate>>(adminQueryKeys.shipping.rates(filters), "/shipping/rates", filters);
  const rates = query.data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "shipping"] });

  const deleteRate = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/shipping/rates/${id}`),
    onSuccess: () => {
      showSuccess("Rate deleted — this district now uses the standard rate");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      showError(err instanceof ApiError ? err.message : "Could not delete the rate.");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<ShippingRate, any>[] = [
    { accessorKey: "district_name", header: "District" },
    {
      accessorKey: "rate",
      header: "Delivery Fee",
      enableSorting: false,
      cell: ({ row }) => <span className="text-body text-ink">{formatAED(row.original.rate)}</span>,
    },
    {
      id: "free_shipping_threshold",
      header: "Free Over",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.free_shipping_threshold !== null ? (
          <span className="text-body text-ink">{formatAED(row.original.free_shipping_threshold)}</span>
        ) : (
          <span className="text-caption text-ink-muted">Site default (AED 500)</span>
        ),
    },
    actionsColumn<ShippingRate>((rate) =>
      defaultRowActions({
        onEdit: () => {
          setEditing(rate);
          setDrawerOpen(true);
        },
        onDelete: () => setDeleteTarget(rate),
      })
    ),
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Rate
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rates}
        isLoading={query.isLoading}
        getRowId={(r) => String(r.id)}
        page={dt.page}
        pageSize={dt.pageSize}
        total={query.data?.meta.total ?? 0}
        onPageChange={dt.setPage}
        onPageSizeChange={dt.setPageSize}
        sorting={dt.sorting}
        onSortingChange={dt.setSorting}
        toolbar={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Search by district…"
              defaultValue={dt.search}
              onChange={(e) => dt.setSearch(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
        }
        emptyState={{
          icon: Truck,
          title: "No shipping rates yet",
          message: "Price a district's delivery fee — districts with no rate use the standard flat fee.",
        }}
      />

      <RateDrawerForm open={drawerOpen} onClose={() => setDrawerOpen(false)} rate={editing} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRate.mutate(deleteTarget.id)}
        itemName={deleteTarget?.district_name ?? ""}
        itemLabel="rate"
        loading={deleteRate.isPending}
      />
    </>
  );
}

function AdminShippingPageContent() {
  return (
    <div>
      <PageHeader
        title="Shipping"
        description="Manage delivery districts and what each one costs to ship to."
      />

      <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-3 text-body text-ink-muted">
        Districts and rates are separate on purpose: create every delivery zone on the Districts tab first
        (bulk-add as many as you need), then price them individually on the Rates tab. A district with no
        rate yet still works at checkout — it just uses the standard flat shipping fee.
      </div>

      <Tabs defaultValue="districts">
        <TabsList className="mb-4">
          <TabsTrigger value="districts">Districts</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="districts">
          <DistrictsTab />
        </TabsContent>
        <TabsContent value="rates">
          <RatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminShippingPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminShippingPageContent />
    </Suspense>
  );
}
