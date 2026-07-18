"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useWatch, Controller, type Control, type UseFormReturn, type FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Switch } from "@/components/admin/ui/Switch";
import { Button } from "@/components/admin/ui/Button";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import type { PaginatedResponse } from "@/types/api";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

const CURRENT_YEAR = new Date().getFullYear();

type VehicleCatalogRow = { id: number; year: number; make: string; model: string; chassis_code: string | null };

/** Plain text input with a filtered suggestion dropdown — used for Make/Model so
 * fitment entries stay consistent with the vehicles catalog without forcing an
 * exact pick (a make/model not yet in the catalog can still be typed freely). */
function SuggestInput({
  value,
  onChange,
  onBlur,
  name,
  placeholder,
  error,
  suggestions,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  name: string;
  placeholder: string;
  error?: boolean;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 8);
  }, [value, suggestions]);

  return (
    <div className="relative">
      <Input
        name={name}
        placeholder={placeholder}
        error={error}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          onBlur();
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-sm border border-border bg-surface shadow-md">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className="block w-full px-3.5 py-2 text-left text-body text-ink hover:bg-app"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FitmentRow({
  control,
  register,
  index,
  remove,
  error,
  allMakes,
  modelsByMake,
  chassisByMakeModel,
}: {
  control: Control<ProductFormValues>;
  register: UseFormReturn<ProductFormValues>["register"];
  index: number;
  remove: (index: number) => void;
  error?: FieldErrors<ProductFormValues["fitments"][number]>;
  allMakes: string[];
  modelsByMake: Map<string, Set<string>>;
  chassisByMakeModel: Map<string, Set<string>>;
}) {
  const make = useWatch({ control, name: `fitments.${index}.make` }) || "";
  const model = useWatch({ control, name: `fitments.${index}.model` }) || "";
  const models = useMemo(
    () => Array.from(modelsByMake.get(make.trim().toLowerCase()) ?? []).sort(),
    [modelsByMake, make]
  );
  const chassisOptions = useMemo(
    () => Array.from(chassisByMakeModel.get(`${make.trim().toLowerCase()}|${model.trim().toLowerCase()}`) ?? []).sort(),
    [chassisByMakeModel, make, model]
  );

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_0.8fr_0.7fr_0.7fr_1.2fr_auto]">
        <Controller
          control={control}
          name={`fitments.${index}.make`}
          render={({ field }) => (
            <SuggestInput
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              placeholder="Toyota"
              error={!!error?.make}
              suggestions={allMakes}
            />
          )}
        />
        <Controller
          control={control}
          name={`fitments.${index}.model`}
          render={({ field }) => (
            <SuggestInput
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              placeholder="Camry"
              error={!!error?.model}
              suggestions={models}
            />
          )}
        />
        <Controller
          control={control}
          name={`fitments.${index}.chassis_code`}
          render={({ field }) => (
            <SuggestInput
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              placeholder="L32 (optional)"
              suggestions={chassisOptions}
            />
          )}
        />
        <Input
          type="number"
          placeholder="2018"
          error={!!error?.year_from}
          {...register(`fitments.${index}.year_from`)}
        />
        <Input
          type="number"
          placeholder="2022"
          error={!!error?.year_to}
          {...register(`fitments.${index}.year_to`)}
        />
        <Input placeholder="e.g. w/o Sport Package" {...register(`fitments.${index}.vin_note`)} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => remove(index)}
          aria-label="Remove fitment"
          className="col-span-2 justify-center text-danger sm:col-span-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {(error?.make || error?.model || error?.year_from || error?.year_to) && (
        <p className="text-caption text-danger">
          {error?.make?.message || error?.model?.message || error?.year_from?.message || error?.year_to?.message}
        </p>
      )}
    </div>
  );
}

export function VehicleCompatibilityCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { control, register, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "fitments" });
  const fitsAll = watch("fits_all_vehicles");

  const vehiclesQuery = useAdminQuery<PaginatedResponse<VehicleCatalogRow>>(
    adminQueryKeys.vehicles.list({ per_page: 1000 }),
    "/vehicles",
    { per_page: 1000 }
  );
  const vehicles = vehiclesQuery.data?.items ?? [];

  const allMakes = useMemo(() => Array.from(new Set(vehicles.map((v) => v.make))).sort(), [vehicles]);
  const modelsByMake = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of vehicles) {
      const key = v.make.toLowerCase();
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(v.model);
    }
    return map;
  }, [vehicles]);
  const chassisByMakeModel = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of vehicles) {
      if (!v.chassis_code) continue;
      const key = `${v.make.toLowerCase()}|${v.model.toLowerCase()}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(v.chassis_code);
    }
    return map;
  }, [vehicles]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-h4 font-bold text-ink">Vehicle Compatibility</h2>
        {!fitsAll && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({ make: "", model: "", chassis_code: "", year_from: CURRENT_YEAR, year_to: CURRENT_YEAR, vin_note: "" })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add fitment
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        <FormField label="Fitment">
          <Switch
            label={fitsAll ? "Fits all vehicles" : "Fits specific vehicles only"}
            checked={fitsAll}
            onChange={(e) => setValue("fits_all_vehicles", e.target.checked, { shouldDirty: true })}
          />
        </FormField>

        {!fitsAll &&
          (fields.length === 0 ? (
            <p className="text-body text-ink-muted">
              No fitment rows yet — add every make/model/year range this part fits, e.g. 2018–2022 Toyota Camry.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="hidden grid-cols-[1fr_1fr_0.8fr_0.7fr_0.7fr_1.2fr_auto] gap-2 text-caption font-semibold uppercase tracking-wide text-ink-muted sm:grid">
                <span>Make</span>
                <span>Model</span>
                <span>Chassis / Gen</span>
                <span>Year</span>
                <span>Year to</span>
                <span>VIN / Option</span>
                <span />
              </div>
              {fields.map((field, index) => (
                <FitmentRow
                  key={field.id}
                  control={control}
                  register={register}
                  index={index}
                  remove={remove}
                  error={formState.errors.fitments?.[index]}
                  allMakes={allMakes}
                  modelsByMake={modelsByMake}
                  chassisByMakeModel={chassisByMakeModel}
                />
              ))}
            </div>
          ))}
      </CardBody>
    </Card>
  );
}
