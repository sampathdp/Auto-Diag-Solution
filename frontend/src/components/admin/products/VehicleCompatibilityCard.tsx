"use client";

import { useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Switch } from "@/components/admin/ui/Switch";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import type { PaginatedResponse } from "@/types/api";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";
import type { Vehicle } from "@/mocks/admin/db";

export function VehicleCompatibilityCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { watch, setValue } = form;
  const fitsAll = watch("fits_all_vehicles");
  const vehicleIds = watch("vehicle_ids");
  const [query, setQuery] = useState("");

  const vehiclesQuery = useAdminQuery<PaginatedResponse<Vehicle>>(
    adminQueryKeys.vehicles.list({ per_page: 100 }),
    "/vehicles",
    { per_page: 100 }
  );
  const vehicles = vehiclesQuery.data?.items ?? [];
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return vehicles
      .filter((v) => !vehicleIds.includes(v.id))
      .filter((v) => `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, vehicles, vehicleIds]);

  const addVehicle = (id: number) => {
    setValue("vehicle_ids", [...vehicleIds, id], { shouldDirty: true });
    setQuery("");
  };
  const removeVehicle = (id: number) => {
    setValue(
      "vehicle_ids",
      vehicleIds.filter((v) => v !== id),
      { shouldDirty: true }
    );
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Vehicle Compatibility</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <FormField label="Fitment">
          <Switch
            label={fitsAll ? "Fits all vehicles" : "Fits specific vehicles only"}
            checked={fitsAll}
            onChange={(e) => setValue("fits_all_vehicles", e.target.checked, { shouldDirty: true })}
          />
        </FormField>

        {!fitsAll && (
          <FormField label="Add Year / Make / Model" helperText="Search and click a match to add it.">
            <div className="relative">
              <Input
                placeholder="e.g. 2020 Toyota Camry…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {matches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-sm border border-border bg-surface shadow-md">
                  {matches.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => addVehicle(v.id)}
                      className="block w-full px-3.5 py-2 text-left text-body text-ink hover:bg-app"
                    >
                      {v.year} {v.make} {v.model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>
        )}

        {!fitsAll && vehicleIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {vehicleIds.map((id) => {
              const v = vehicleById.get(id);
              if (!v) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-caption font-semibold text-primary"
                >
                  {v.year} {v.make} {v.model}
                  <button type="button" onClick={() => removeVehicle(id)} aria-label={`Remove ${v.make} ${v.model}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
