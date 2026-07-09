"use client";

import type { UseFormReturn } from "react-hook-form";
import { RefreshCw } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { Switch } from "@/components/admin/ui/Switch";
import { Button } from "@/components/admin/ui/Button";
import { generateSku } from "@/lib/admin/utils";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";
import type { Category } from "@/mocks/admin/db";
import type { Brand } from "@/types/brand";

export function BasicInfoCard({
  form,
  categories,
  brands,
}: {
  form: UseFormReturn<ProductFormValues>;
  categories: Category[];
  brands: Brand[];
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Basic Info</h2>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="SKU" htmlFor="sku" error={errors.sku?.message} required>
          <div className="flex gap-2">
            <Input id="sku" error={!!errors.sku} {...register("sku")} className="font-mono" />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setValue("sku", generateSku(), { shouldValidate: true, shouldDirty: true })}
              aria-label="Auto-generate SKU"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </FormField>

        <FormField label="Brand" htmlFor="brand_id" error={errors.brand_id?.message}>
          <Select
            id="brand_id"
            error={!!errors.brand_id}
            value={watch("brand_id") ?? ""}
            onChange={(e) => setValue("brand_id", e.target.value ? Number(e.target.value) : null, { shouldDirty: true })}
          >
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_en}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Category" htmlFor="category_id" error={errors.category_id?.message} required>
          <Select id="category_id" error={!!errors.category_id} {...register("category_id")}>
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? `— ${c.name_en}` : c.name_en}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Status">
          <Switch
            label={watch("is_active") ? "Active" : "Inactive"}
            checked={watch("is_active")}
            onChange={(e) => setValue("is_active", e.target.checked, { shouldDirty: true })}
          />
        </FormField>
      </CardBody>
    </Card>
  );
}
