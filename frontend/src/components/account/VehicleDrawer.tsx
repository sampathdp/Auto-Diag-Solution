"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";
import { Loader2, ChevronDown, ShieldCheck, HelpCircle } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useVehicleFilters } from "@/hooks/useVehicleFilters";

const vehicleSchema = z.object({
  year: z.string().min(4, "Year is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional(),
  
  body_type: z.string().optional(),
  engine: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  drive_type: z.string().optional(),
  color: z.string().optional(),
  
  vin: z.string()
    .optional()
    .refine(val => !val || (val.length === 17 && !/[IQOiqo]/.test(val)), "Invalid VIN format (17 chars, no I, O, Q)"),
  license_plate: z.string().optional(),
  mileage: z.string().optional(),
  
  nickname: z.string().optional(),
  purchase_date: z.string().optional(),
  is_default: z.boolean().default(false),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleDrawerProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function VehicleDrawer({ initialData, onSubmit, onCancel }: VehicleDrawerProps) {
  const [showOptional, setShowOptional] = useState(!!initialData?.vin || !!initialData?.body_type);
  const [partCount, setPartCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      year: initialData?.year?.toString() || "",
      make: initialData?.make || "",
      model: initialData?.model || "",
      trim: initialData?.trim || "",
      body_type: initialData?.body_type || "",
      engine: initialData?.engine || "",
      fuel_type: initialData?.fuel_type || "",
      transmission: initialData?.transmission || "",
      drive_type: initialData?.drive_type || "",
      color: initialData?.color || "",
      vin: initialData?.vin || "",
      license_plate: initialData?.license_plate || "",
      mileage: initialData?.mileage?.toString() || "",
      nickname: initialData?.nickname || "",
      purchase_date: initialData?.purchase_date || "",
      is_default: initialData?.is_default || false,
    },
  });

  const { confirmDiscard } = useUnsavedChangesGuard(form.formState.isDirty);

  const watchYear = form.watch("year");
  const watchMake = form.watch("make");
  const watchModel = form.watch("model");

  // Cascading Year -> Make -> Model options come from the same catalog the shop's
  // "find parts for my vehicle" search uses (see VehicleFinder/ShopSidebar) — a garage
  // vehicle outside that catalog could never actually match any fitment anyway, so the
  // "instantly filter the shop to parts that fit" promise below only holds if we only
  // ever offer vehicles the catalog knows about.
  const { data: vehicleOptions } = useVehicleFilters(watchYear, watchMake);
  const availableYears = vehicleOptions?.years ?? [];
  const availableMakes = vehicleOptions?.makes ?? [];
  const availableModels = vehicleOptions?.models ?? [];

  useEffect(() => {
    if (watchYear && watchMake && watchModel) {
      setLoadingCount(true);
      const timer = setTimeout(async () => {
        try {
          const res = await apiClient.get(`/vehicles/part-count?year=${watchYear}&make=${watchMake}&model=${watchModel}`);
          setPartCount(res.data.data.count);
        } catch (e) {
          setPartCount(null);
        } finally {
          setLoadingCount(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPartCount(null);
    }
  }, [watchYear, watchMake, watchModel]);

  const handleCancel = () => {
    if (confirmDiscard()) {
      onCancel();
    }
  };

  const handleSubmit = async (data: VehicleFormValues) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex h-full flex-col">
      <div className="flex-1 space-y-6">
        
        {/* Required Identity Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Year *</label>
            <div className="relative">
              <select
                {...form.register("year")}
                onChange={(e) => {
                  form.setValue("year", e.target.value, { shouldDirty: true });
                  form.setValue("make", "");
                  form.setValue("model", "");
                  form.setValue("trim", "");
                }}
                className={cn(
                  "flex h-10 w-full appearance-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  form.formState.errors.year && "border-destructive"
                )}
              >
                <option value="">Select Year</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {form.formState.errors.year && <span className="text-xs text-destructive">{form.formState.errors.year.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Make *</label>
            <div className="relative">
              <select
                {...form.register("make")}
                disabled={!watchYear}
                onChange={(e) => {
                  form.setValue("make", e.target.value, { shouldDirty: true });
                  form.setValue("model", "");
                  form.setValue("trim", "");
                }}
                className={cn(
                  "flex h-10 w-full appearance-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
                  form.formState.errors.make && "border-destructive"
                )}
              >
                <option value="">Select Make</option>
                {availableMakes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {form.formState.errors.make && <span className="text-xs text-destructive">{form.formState.errors.make.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Model *</label>
            <div className="relative">
              <select
                {...form.register("model")}
                disabled={!watchMake}
                onChange={(e) => {
                  form.setValue("model", e.target.value, { shouldDirty: true });
                  form.setValue("trim", "");
                }}
                className={cn(
                  "flex h-10 w-full appearance-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
                  form.formState.errors.model && "border-destructive"
                )}
              >
                <option value="">Select Model</option>
                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {form.formState.errors.model && <span className="text-xs text-destructive">{form.formState.errors.model.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Trim / Variant</label>
            <input
              {...form.register("trim")}
              disabled={!watchModel}
              placeholder="e.g. VXR, GXR, LE (optional)"
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
                form.formState.errors.trim && "border-destructive"
              )}
            />
          </div>

          {/* Live Lookup Result */}
          {watchYear && watchMake && watchModel && (
            <div className="rounded-lg bg-primary/5 p-3 flex items-start gap-3 border border-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary-dark">
                  {loadingCount ? "Finding parts..." : `${partCount?.toLocaleString()} parts available`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save this vehicle to instantly filter the shop to parts that fit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Personalization Section */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personalize</h4>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Nickname</label>
            <input
              {...form.register("nickname")}
              placeholder="e.g. My Land Cruiser, Wife's car"
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {!initialData?.is_default && (
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_default"
                {...form.register("is_default")}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is_default" className="text-sm font-medium leading-none">
                Set as my default vehicle
              </label>
            </div>
          )}
        </div>

        {/* Optional Details Toggle */}
        <div className="pt-4 border-t">
          <button 
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {showOptional ? "Hide additional details" : "Add more details (VIN, Body, Engine...)"}
          </button>
        </div>

        {/* Optional Details Section */}
        {showOptional && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium flex items-center justify-between">
                VIN
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </label>
              <input
                {...form.register("vin")}
                placeholder="17 character Vehicle Identification Number"
                className={cn(
                  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  form.formState.errors.vin && "border-destructive"
                )}
                maxLength={17}
              />
              {form.formState.errors.vin && <span className="text-xs text-destructive">{form.formState.errors.vin.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Body Type</label>
                <select
                  {...form.register("body_type")}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Select</option>
                  <option value="SUV">SUV</option>
                  <option value="Sedan">Sedan</option>
                  <option value="Coupe">Coupe</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Wagon">Wagon</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Fuel Type</label>
                <select
                  {...form.register("fuel_type")}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Select</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Transmission</label>
                <select
                  {...form.register("transmission")}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Select</option>
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Drive Type</label>
                <select
                  {...form.register("drive_type")}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Select</option>
                  <option value="2WD">2WD</option>
                  <option value="4WD">4WD</option>
                  <option value="AWD">AWD</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">License Plate</label>
              <input
                {...form.register("license_plate")}
                placeholder="e.g. Dubai A 12345"
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">Used by some fitment centers for quick identification.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Current Mileage (KM)</label>
              <input
                type="number"
                {...form.register("mileage")}
                placeholder="e.g. 50000"
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

          </div>
        )}

      </div>

      <div className="mt-8 flex justify-end gap-3 border-t bg-background pt-4">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!form.formState.isDirty || !form.formState.isValid || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {form.formState.isSubmitting ? "Saving..." : "Save Vehicle"}
        </Button>
      </div>
    </form>
  );
}
