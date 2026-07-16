"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { Button } from "@/components/admin/ui/Button";
import { VehicleGroupDrawerForm } from "@/components/admin/vehicles/VehicleGroupDrawerForm";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
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
  yearRange: string;
  productsCount: number;
}

export default function AdminVehiclesPage() {
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

  const vehicles = vehiclesQuery.data?.items ?? [];
  const products = productsQuery.data?.items ?? [];

  const [addOpen, setAddOpen] = useState(false);

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
    const map = new Map<string, { make: string; model: string; years: number[] }>();
    for (const v of vehicles) {
      const key = `${v.make}|${v.model}`;
      if (!map.has(key)) map.set(key, { make: v.make, model: v.model, years: [] });
      map.get(key)!.years.push(v.year);
    }
    return [...map.values()]
      .map(({ make, model, years }) => {
        const min = Math.min(...years);
        const max = Math.max(...years);
        // Fitment is freeform ranges now (make/model text + year_from/year_to), not
        // links to catalog vehicle ids — a product "fits" this model row when any of
        // its fitment rows matches the make/model and overlaps the row's year span.
        // (?? [] guards products served by the legacy mock handlers, which predate
        // the fitments field.)
        const productsCount = products.filter((p) =>
          (p.fitments ?? []).some(
            (f) =>
              f.make.toLowerCase() === make.toLowerCase() &&
              f.model.toLowerCase() === model.toLowerCase() &&
              f.year_from <= max &&
              f.year_to >= min
          )
        ).length;
        return { make, model, yearRange: min === max ? String(min) : `${min}–${max}`, productsCount };
      })
      .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
  }, [vehicles, products]);

  // No per-row/per-group edit or delete columns here — the mock's group-level
  // rename/delete-by-filter actions have no backend equivalent (only single-row
  // POST/PUT/DELETE /vehicles/{id} exist). This page is a browse view over the
  // catalog plus single-vehicle add; see ARCHITECTURE.md §8.4.
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
    { accessorKey: "yearRange", header: "Years Covered" },
    { accessorKey: "productsCount", header: "Products Tagged to Fit It" },
  ];

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description={`${vehicles.length} year/make/model entries in your fitment catalog`}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        }
      />

      <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-3 text-body text-ink-muted">
        This is the reference catalog of vehicles (year + make + model, e.g. "2022 Toyota Camry"). It powers
        the Make/Model suggestions on the product form's fitment table and the Year/Make/Model search
        customers use on the storefront — keep it complete so shoppers can find their vehicle. The three
        tabs below are the same list, just grouped differently so you can check your coverage.
      </div>

      <Tabs defaultValue="years">
        <TabsList className="mb-2">
          <TabsTrigger value="years">Years</TabsTrigger>
          <TabsTrigger value="makes">Makes</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
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
      </Tabs>

      <VehicleGroupDrawerForm open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
