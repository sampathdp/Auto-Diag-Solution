"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";

const addressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  customLabel: z.string().optional(),
  name: z.string().min(2, "Full name is required"),
  phone: z.string().regex(/^\+971(5[0-9]|2|3|4|6|7|9)[0-9]{7}$/, "Must be a valid UAE phone number"),
  emirate: z.enum(["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"]),
  area: z.string().min(2, "Area is required"),
  building: z.string().min(1, "Building name/number is required"),
  apartment: z.string().optional(),
  street: z.string().optional(),
  instructions: z.string().optional(),
  is_default: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  initialData?: any;
  defaultName: string;
  defaultPhone: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function AddressForm({ initialData, defaultName, defaultPhone, onSubmit, onCancel }: AddressFormProps) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initialData?.label && ["Home", "Office"].includes(initialData.label) ? initialData.label : initialData?.label ? "Other" : "Home",
      customLabel: initialData?.label && !["Home", "Office"].includes(initialData.label) ? initialData.label : "",
      name: initialData?.name || defaultName || "",
      phone: initialData?.phone || defaultPhone || "+971",
      emirate: initialData?.emirate || "Dubai",
      area: initialData?.area || "",
      building: initialData?.building || "",
      apartment: initialData?.apartment || "",
      street: initialData?.street || "",
      instructions: initialData?.instructions || "",
      is_default: initialData?.is_default || false,
    },
  });

  const { confirmDiscard } = useUnsavedChangesGuard(form.formState.isDirty);

  const handleCancel = () => {
    if (confirmDiscard()) {
      onCancel();
    }
  };

  const handleSubmit = async (data: AddressFormValues) => {
    const finalData = {
      ...data,
      label: data.label === "Other" ? data.customLabel : data.label,
    };
    await onSubmit(finalData);
  };

  const labelType = form.watch("label");
  const emirate = form.watch("emirate");

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex h-full flex-col">
      <div className="flex-1 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Address Label</label>
            <select
              {...form.register("label")}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {labelType === "Other" && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Custom Label</label>
              <input
                {...form.register("customLabel")}
                placeholder="e.g. Grandma's House"
                className={cn(
                  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  form.formState.errors.customLabel && "border-destructive"
                )}
              />
              {form.formState.errors.customLabel && <span className="text-xs text-destructive">{form.formState.errors.customLabel.message}</span>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <input
              {...form.register("name")}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                form.formState.errors.name && "border-destructive"
              )}
            />
            {form.formState.errors.name && <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Phone Number</label>
            <input
              {...form.register("phone")}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                form.formState.errors.phone && "border-destructive"
              )}
            />
            {form.formState.errors.phone && <span className="text-xs text-destructive">{form.formState.errors.phone.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Emirate</label>
            <select
              {...form.register("emirate")}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="Dubai">Dubai</option>
              <option value="Abu Dhabi">Abu Dhabi</option>
              <option value="Sharjah">Sharjah</option>
              <option value="Ajman">Ajman</option>
              <option value="Ras Al Khaimah">Ras Al Khaimah</option>
              <option value="Fujairah">Fujairah</option>
              <option value="Umm Al Quwain">Umm Al Quwain</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Area / Neighborhood</label>
            <input
              {...form.register("area")}
              list="area-suggestions"
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                form.formState.errors.area && "border-destructive"
              )}
            />
            <datalist id="area-suggestions">
              {emirate === "Dubai" && (
                <>
                  <option value="Dubai Marina" />
                  <option value="Business Bay" />
                  <option value="Jumeirah Lake Towers (JLT)" />
                  <option value="Downtown Dubai" />
                  <option value="Al Barsha" />
                </>
              )}
            </datalist>
            {form.formState.errors.area && <span className="text-xs text-destructive">{form.formState.errors.area.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Building Name/No.</label>
            <input
              {...form.register("building")}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                form.formState.errors.building && "border-destructive"
              )}
            />
            {form.formState.errors.building && <span className="text-xs text-destructive">{form.formState.errors.building.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Apartment/Floor (Optional)</label>
            <input
              {...form.register("apartment")}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Street (Optional)</label>
            <input
              {...form.register("street")}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Delivery Instructions (Optional)</label>
            <textarea
              {...form.register("instructions")}
              rows={3}
              className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
            />
          </div>

          {!initialData?.is_default && (
            <div className="flex items-center gap-3 sm:col-span-2 pt-2 border-t">
              <input
                type="checkbox"
                id="is_default"
                {...form.register("is_default")}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is_default" className="text-sm font-medium leading-none">
                Set as default delivery address
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t bg-background pt-4">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!form.formState.isDirty || !form.formState.isValid || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Address"}
        </Button>
      </div>
    </form>
  );
}
