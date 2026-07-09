"use client";

import type { UseFormReturn } from "react-hook-form";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Switch } from "@/components/admin/ui/Switch";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

export function InventoryCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const trackInventory = watch("track_inventory");

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Inventory</h2>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Track Inventory" className="sm:col-span-2">
          <Switch
            label={trackInventory ? "Stock is tracked for this product" : "Always shown as in stock"}
            checked={trackInventory}
            onChange={(e) => setValue("track_inventory", e.target.checked, { shouldDirty: true })}
          />
        </FormField>

        <FormField label="Stock Quantity" htmlFor="stock_quantity" error={errors.stock_quantity?.message}>
          <Input
            id="stock_quantity"
            type="number"
            min="0"
            disabled={!trackInventory}
            error={!!errors.stock_quantity}
            {...register("stock_quantity", { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          label="Low Stock Threshold"
          htmlFor="low_stock_threshold"
          error={errors.low_stock_threshold?.message}
          helperText="Below this quantity, the product shows as low stock in the admin."
        >
          <Input
            id="low_stock_threshold"
            type="number"
            min="0"
            disabled={!trackInventory}
            error={!!errors.low_stock_threshold}
            {...register("low_stock_threshold", { valueAsNumber: true })}
          />
        </FormField>
      </CardBody>
    </Card>
  );
}
