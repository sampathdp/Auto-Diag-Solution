"use client";

import type { UseFormReturn } from "react-hook-form";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Switch } from "@/components/admin/ui/Switch";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

export function PricingCard({
  form,
  canEditWholesale,
}: {
  form: UseFormReturn<ProductFormValues>;
  /** b2b.pricing.manage: without it the wholesale fields are shown read-only. */
  canEditWholesale: boolean;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const price = watch("price");
  const wholesale = watch("wholesale_price");
  const savingsPercent =
    typeof price === "number" && price > 0 && typeof wholesale === "number" && wholesale > 0 && wholesale <= price
      ? Math.round(((price - wholesale) / price) * 1000) / 10
      : null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Pricing</h2>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>

        <div className="border-t border-border pt-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-ink">Wholesale (dealers)</h3>
            {savingsPercent != null && (
              <span className="text-xs text-ink-muted">Dealers save {savingsPercent}% on retail</span>
            )}
          </div>
          {!canEditWholesale && (
            <p className="mb-3 text-xs text-ink-muted">
              {wholesale == null
                ? "This product has no wholesale price yet, so it can't be saved. Ask an admin with the “Set wholesale prices” permission to add one."
                : "Only admins with the “Set wholesale prices” permission can change these."}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Wholesale price (AED)"
              htmlFor="wholesale_price"
              error={errors.wholesale_price?.message}
              helperText="Approved dealers pay this. It can't be higher than the retail price."
              required
            >
              <Input
                id="wholesale_price"
                type="number"
                step="0.01"
                min="0"
                readOnly={!canEditWholesale}
                className={!canEditWholesale ? "cursor-not-allowed opacity-70" : undefined}
                error={!!errors.wholesale_price}
                {...register("wholesale_price", { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label="Minimum quantity for wholesale"
              htmlFor="wholesale_min_qty"
              error={errors.wholesale_min_qty?.message}
              helperText="Leave empty to give dealers the wholesale price from 1 unit."
            >
              <Input
                id="wholesale_min_qty"
                type="number"
                step="1"
                min="1"
                readOnly={!canEditWholesale}
                className={!canEditWholesale ? "cursor-not-allowed opacity-70" : undefined}
                error={!!errors.wholesale_min_qty}
                {...register("wholesale_min_qty", { valueAsNumber: true })}
              />
            </FormField>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
