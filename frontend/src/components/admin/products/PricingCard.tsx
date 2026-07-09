"use client";

import type { UseFormReturn } from "react-hook-form";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Switch } from "@/components/admin/ui/Switch";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

export function PricingCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Pricing</h2>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Price (AED)" htmlFor="price" error={errors.price?.message} required>
          <Input id="price" type="number" step="0.01" min="0" error={!!errors.price} {...register("price", { valueAsNumber: true })} />
        </FormField>

        <FormField
          label="Compare-at Price (AED)"
          htmlFor="compare_at_price"
          error={errors.compare_at_price?.message}
          helperText="Shown crossed out on the storefront when higher than the price."
        >
          <Input
            id="compare_at_price"
            type="number"
            step="0.01"
            min="0"
            {...register("compare_at_price", { valueAsNumber: true })}
          />
        </FormField>

        <FormField label="Cost (AED)" htmlFor="cost_price" helperText="Admin-only — never shown on the storefront.">
          <Input id="cost_price" type="number" step="0.01" min="0" {...register("cost_price", { valueAsNumber: true })} />
        </FormField>

        <FormField label="VAT">
          <Switch
            label={watch("vat_inclusive") ? "Price is VAT-inclusive" : "Price excludes VAT"}
            checked={watch("vat_inclusive")}
            onChange={(e) => setValue("vat_inclusive", e.target.checked, { shouldDirty: true })}
          />
        </FormField>
      </CardBody>
    </Card>
  );
}
