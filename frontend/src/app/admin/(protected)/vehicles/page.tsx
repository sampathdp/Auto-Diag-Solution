"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { actionsColumn } from "@/components/admin/columns";
import { defaultRowActions } from "@/components/admin/ActionsMenu";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { VehicleDrawerForm } from "@/components/admin/vehicles/VehicleDrawerForm";
import { VehicleBulkAddDrawer } from "@/components/admin/vehicles/VehicleBulkAddDrawer";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import type { PaginatedResponse } from "@/types/api";
import type { Vehicle } from "@/mocks/admin/db";
import type { Product } from "@/types/product";

interface YearRow {
  year: number;
  comboCount: number;
}
interface MakeRow {
  make: string;
  modelsCount: number;
}
interface ModelRow {
  make: string;
  model: string;
  chassisCode: string | null;
  yearRange: string;
  productsCount: number;
}

function AdminVehiclesPageContent() {
  const queryClient = useQueryClient();
  const dt = useDataTable({ defaultPageSize: 20, defaultSort: { id: "year", desc: true } });

  // Full set (uncapped by the "All Vehicles" tab's pagination) used to build the
  // aggregated Years/Makes/Models views below.
  const vehiclesQuery = useAdminQuery<PaginatedResponse<Vehicle>>(
    adminQueryKeys.vehicles.list({ per_page: 500 }),
    "/vehicles",
    { per_page: 500 }
  );
  const productsQuery = useAdminQuery<PaginatedResponse<Product>>(
    adminQueryKeys.products.list({ per_page: 200 }),
    "/products",
    { per_page: 200 }
  );

  // Server-paginated single-row list backing the "All Vehicles" tab, where edit
  // and delete act on one catalog row (PUT/DELETE /vehicles/{id}).
  const listFilters = {
    search: dt.search || undefined,
    page: dt.page,
    per_page: dt.pageSize,
    sort_by: dt.sorting[0]?.id,
    sort_dir: dt.sorting[0]?.desc ? "desc" : "asc",
  };
  const vehicleListQuery = useAdminQuery<PaginatedResponse<Vehicle>>(
    adminQueryKeys.vehicles.list(listFilters),
    "/vehicles",
    listFilters
  );

  const vehicles = vehiclesQuery.data?.items ?? [];
  const products = productsQuery.data?.items ?? [];
  const vehicleRows = vehicleListQuery.data?.items ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "vehicles", "list"] });

  const deleteVehicle = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/vehicles/${id}`),
    onSuccess: () => {
      showSuccess("Vehicle deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      showError(err instanceof ApiError ? err.message : "Could not delete the vehicle.");
      setDeleteTarget(null);
    },
  });

  const yearRows: YearRow[] = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const v of vehicles) {
      if (!map.has(v.year)) map.set(v.year, new Set());
      map.get(v.year)!.add(`${v.make}|${v.model}`);
    }
    return [...map.entries()].map(([year, combos]) => ({ year, comboCount: combos.size })).sort((a, b) => b.year - a.year);
  }, [vehicles]);

  const makeRows: MakeRow[] = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of vehicles) {
      if (!map.has(v.make)) map.set(v.make, new Set());
      map.get(v.make)!.add(v.model);
    }
    return [...map.entries()].map(([make, models]) => ({ make, modelsCount: models.size })).sort((a, b) => a.make.localeCompare(b.make));
  }, [vehicles]);

  const modelRows: ModelRow[] = useMemo(() => {
    // Keyed by make+model+chassis (not just make+model) — two generations of the same
    // model (e.g. Nissan Altima L32 vs L33) are different vehicles that can share model
    // years, so they need their own row rather than being merged into one year range.
    const map = new Map<string, { make: string; model: string; chassisCode: string | null; years: number[] }>();
    for (const v of vehicles) {
      const key = `${v.make}|${v.model}|${v.chassis_code ?? ""}`;
      if (!map.has(key)) map.set(key, { make: v.make, model: v.model, chassisCode: v.chassis_code, years: [] });
      map.get(key)!.years.push(v.year);
    }
    return [...map.values()]
      .map(({ make, model, chassisCode, years }) => {
        const min = Math.min(...years);
        const max = Math.max(...years);
        // Fitment is freeform ranges now (make/model text + year_from/year_to), not
        // links to catalog vehicle ids — a product "fits" this model row when any of
        // its fitment rows matches the make/model and overlaps the row's year span.
        // (?? [] guards products served by the legacy mock handlers, which predate
        // the fitments field.) Fitment rows don't gate on chassis_code here since a
        // product's own fitment chassis (if any) is compared separately, not folded
        // into this coverage count.
        const productsCount = products.filter((p) =>
          (p.fitments ?? []).some(
            (f) =>
              f.make.toLowerCase() === make.toLowerCase() &&
              f.model.toLowerCase() === model.toLowerCase() &&
              f.year_from <= max &&
              f.year_to >= min
          )
        ).length;
        return { make, model, chassisCode, yearRange: min === max ? String(min) : `${min}–${max}`, productsCount };
      })
      .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || (a.chassisCode ?? "").localeCompare(b.chassisCode ?? ""));
  }, [vehicles, products]);

  const yearColumns: ColumnDef<YearRow, any>[] = [
    { accessorKey: "year", header: "Model Year" },
    { accessorKey: "comboCount", header: "Vehicle Models Covered" },
  ];

  const makeColumns: ColumnDef<MakeRow, any>[] = [
    { accessorKey: "make", header: "Manufacturer" },
    { accessorKey: "modelsCount", header: "Models on File" },
  ];

  const modelColumns: ColumnDef<ModelRow, any>[] = [
    { accessorKey: "model", header: "Model" },
    { accessorKey: "make", header: "Make" },
    { accessorKey: "chassisCode", header: "Chassis / Gen", cell: ({ row }) => row.original.chassisCode || "—" },
    { accessorKey: "yearRange", header: "Years Covered" },
    { accessorKey: "productsCount", header: "Products Tagged to Fit It" },
  ];

  const vehicleColumns: ColumnDef<Vehicle, any>[] = [
    { accessorKey: "year", header: "Year" },
    { accessorKey: "make", header: "Make" },
    { accessorKey: "model", header: "Model" },
    { accessorKey: "chassis_code", header: "Chassis / Gen", enableSorting: false, cell: ({ row }) => row.original.chassis_code || "—" },
    { accessorKey: "products_count", header: "Products Tagged", enableSorting: false },
    actionsColumn<Vehicle>((vehicle) =>
      defaultRowActions({
        onEdit: () => {
          setEditingVehicle(vehicle);
          setAddOpen(true);
        },
        onDelete: () => setDeleteTarget(vehicle),
      })
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description={`${vehicles.length} year/make/model entries in your fitment catalog`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setBulkAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Bulk Add (Year Range)
            </Button>
            <Button
              onClick={() => {
                setEditingVehicle(null);
                setAddOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        }
      />

      <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-3 text-body text-ink-muted">
        This is the reference catalog of vehicles (year + make + model, e.g. "2022 Toyota Camry"). It powers
        the Make/Model suggestions on the product form's fitment table and the Year/Make/Model search
        customers use on the storefront — keep it complete so shoppers can find their vehicle. The Years/Makes/Models
        tabs are the same list grouped differently so you can check your coverage; use "All Vehicles" to edit or
        delete a specific entry.
      </div>

      <Tabs defaultValue="years">
        <TabsList className="mb-2">
          <TabsTrigger value="years">Years</TabsTrigger>
          <TabsTrigger value="makes">Makes</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="all">All Vehicles</TabsTrigger>
        </TabsList>

        <TabsContent value="years">
          <p className="mb-3 text-caption text-ink-muted">
            For each model year, how many distinct vehicle models (across all makes) have an entry.
          </p>
          <DataTable columns={yearColumns} data={yearRows} isLoading={vehiclesQuery.isLoading} />
        </TabsContent>
        <TabsContent value="makes">
          <p className="mb-3 text-caption text-ink-muted">
            For each manufacturer, how many distinct models are on file (any year).
          </p>
          <DataTable columns={makeColumns} data={makeRows} isLoading={vehiclesQuery.isLoading} />
        </TabsContent>
        <TabsContent value="models">
          <p className="mb-3 text-caption text-ink-muted">
            Every specific model, the year range it spans, and how many of your products are tagged to fit it.
          </p>
          <DataTable columns={modelColumns} data={modelRows} isLoading={vehiclesQuery.isLoading || productsQuery.isLoading} />
        </TabsContent>
        <TabsContent value="all">
          <p className="mb-3 text-caption text-ink-muted">
            Every individual catalog row. Edit or delete a specific year/make/model entry here.
          </p>
          <DataTable
            columns={vehicleColumns}
            data={vehicleRows}
            isLoading={vehicleListQuery.isLoading}
            getRowId={(v) => String(v.id)}
            page={dt.page}
            pageSize={dt.pageSize}
            total={vehicleListQuery.data?.meta.total ?? 0}
            onPageChange={dt.setPage}
            onPageSizeChange={dt.setPageSize}
            sorting={dt.sorting}
            onSortingChange={dt.setSorting}
            toolbar={
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  placeholder="Search make or model…"
                  defaultValue={dt.search}
                  onChange={(e) => dt.setSearch(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
            }
          />
        </TabsContent>
      </Tabs>

      <VehicleDrawerForm
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditingVehicle(null);
        }}
        vehicle={editingVehicle}
      />

      <VehicleBulkAddDrawer open={bulkAddOpen} onClose={() => setBulkAddOpen(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteVehicle.mutate(deleteTarget.id)}
        itemName={
          deleteTarget
            ? `${deleteTarget.year} ${deleteTarget.make} ${deleteTarget.model}${deleteTarget.chassis_code ? ` (${deleteTarget.chassis_code})` : ""}`
            : ""
        }
        itemLabel="vehicle"
        loading={deleteVehicle.isPending}
      />
    </div>
  );
}

export default function AdminVehiclesPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminVehiclesPageContent />
    </Suspense>
  );
}
