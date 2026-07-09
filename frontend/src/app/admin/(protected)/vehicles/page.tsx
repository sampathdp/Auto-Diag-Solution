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
import type { Product, Vehicle } from "@/mocks/admin/db";

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
    const map = new Map<string, { make: string; model: string; years: number[]; vehicleIds: number[] }>();
    for (const v of vehicles) {
      const key = `${v.make}|${v.model}`;
      if (!map.has(key)) map.set(key, { make: v.make, model: v.model, years: [], vehicleIds: [] });
      const entry = map.get(key)!;
      entry.years.push(v.year);
      entry.vehicleIds.push(v.id);
    }
    return [...map.values()]
      .map(({ make, model, years, vehicleIds }) => {
        const min = Math.min(...years);
        const max = Math.max(...years);
        const productsCount = products.filter((p) => p.vehicle_ids.some((id) => vehicleIds.includes(id))).length;
        return { make, model, yearRange: min === max ? String(min) : `${min}–${max}`, productsCount };
      })
      .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
  }, [vehicles, products]);

  // No per-row/per-group edit or delete columns here — the mock's group-level
  // rename/delete-by-filter actions have no backend equivalent (only single-row
  // POST/PUT/DELETE /vehicles/{id} exist). This page is a browse view over the
  // catalog plus single-vehicle add; see ARCHITECTURE.md §8.4.
  const yearColumns: ColumnDef<YearRow, any>[] = [
    { accessorKey: "year", header: "Year" },
    { accessorKey: "comboCount", header: "Make/Model Combos" },
  ];

  const makeColumns: ColumnDef<MakeRow, any>[] = [
    { accessorKey: "make", header: "Make" },
    { accessorKey: "modelsCount", header: "Models" },
  ];

  const modelColumns: ColumnDef<ModelRow, any>[] = [
    { accessorKey: "model", header: "Model" },
    { accessorKey: "make", header: "Make" },
    { accessorKey: "yearRange", header: "Year Range" },
    { accessorKey: "productsCount", header: "Compatible Products" },
  ];

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description={`${vehicles.length} year/make/model combinations for fitment search`}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        }
      />

      <Tabs defaultValue="years">
        <TabsList className="mb-4">
          <TabsTrigger value="years">Years</TabsTrigger>
          <TabsTrigger value="makes">Makes</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
        </TabsList>

        <TabsContent value="years">
          <DataTable columns={yearColumns} data={yearRows} isLoading={vehiclesQuery.isLoading} />
        </TabsContent>
        <TabsContent value="makes">
          <DataTable columns={makeColumns} data={makeRows} isLoading={vehiclesQuery.isLoading} />
        </TabsContent>
        <TabsContent value="models">
          <DataTable columns={modelColumns} data={modelRows} isLoading={vehiclesQuery.isLoading || productsQuery.isLoading} />
        </TabsContent>
      </Tabs>

      <VehicleGroupDrawerForm open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
