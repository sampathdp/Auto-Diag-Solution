"use client";

import type { UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { Switch } from "@/components/admin/ui/Switch";
import { Button } from "@/components/admin/ui/Button";
import { generateSku } from "@/lib/admin/utils";
import { adminApi } from "@/lib/admin/api-client";
import { showSuccess } from "@/components/admin/ui/toast";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";
import type { Category } from "@/mocks/admin/db";
import type { Brand } from "@/types/brand";

export function BasicInfoCard({
  form,
  categories,
  brands,
  productId,
}: {
  form: UseFormReturn<ProductFormValues>;
  categories: Category[];
  brands: Brand[];
  /** Set in edit mode — enables the Fulfillor link/create actions (they need a saved product). */
  productId?: number;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  type FulfillorLinkResult = { fulfillor_product_id: string; created: boolean };
  const onLinked = (result: FulfillorLinkResult) => {
    setValue("fulfillor_product_id", result.fulfillor_product_id, { shouldDirty: false });
    showSuccess(
      result.created
        ? `Created in Fulfillor as product ${result.fulfillor_product_id}`
        : `Linked to Fulfillor product ${result.fulfillor_product_id}`
    );
  };
  // Read-only on Fulfillor's side: finds the product there by this product's SKU.
  const linkFulfillor = useMutation({
    mutationFn: () => adminApi.post<FulfillorLinkResult>(`/products/${productId}/fulfillor/link`),
    onSuccess: onLinked,
  });
  // Writes to Fulfillor (creates the product there) — confirmed first.
  const createInFulfillor = useMutation({
    mutationFn: () => adminApi.post<FulfillorLinkResult>(`/products/${productId}/fulfillor/create`),
    onSuccess: onLinked,
  });
  const fulfillorId = watch("fulfillor_product_id");

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

        <FormField label="Part Type" htmlFor="part_type" error={errors.part_type?.message}>
          <Select
            id="part_type"
            error={!!errors.part_type}
            value={watch("part_type") ?? ""}
            onChange={(e) =>
              setValue("part_type", e.target.value ? (e.target.value as "genuine" | "aftermarket" | "oem") : null, {
                shouldDirty: true,
              })
            }
          >
            <option value="">Not set</option>
            <option value="genuine">Genuine</option>
            <option value="aftermarket">Aftermarket</option>
            <option value="oem">OEM</option>
          </Select>
        </FormField>

        <FormField label="OEM/Part Number" htmlFor="oem_part_number" error={errors.oem_part_number?.message}>
          <Input
            id="oem_part_number"
            placeholder="53200-64P01"
            className="font-mono"
            {...register("oem_part_number")}
          />
        </FormField>

        <FormField
          label="Fulfillor Product ID"
          htmlFor="fulfillor_product_id"
          error={errors.fulfillor_product_id?.message}
          helperText="The product's id in Fulfillor (3PL). Orders containing unmapped products can't be sent to the warehouse."
        >
          <div className="flex flex-col gap-2">
            <Input
              id="fulfillor_product_id"
              placeholder="106024"
              className="font-mono"
              {...register("fulfillor_product_id")}
            />
            {productId !== undefined && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={linkFulfillor.isPending}
                  onClick={() => linkFulfillor.mutate()}
                >
                  Find by SKU
                </Button>
                {!fulfillorId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={createInFulfillor.isPending}
                    onClick={() => {
                      if (window.confirm("Create this product in Fulfillor (live 3PL account)? Save any unsaved changes first — the saved name, price and SKU are sent.")) {
                        createInFulfillor.mutate();
                      }
                    }}
                  >
                    Create in Fulfillor
                  </Button>
                )}
              </div>
            )}
          </div>
        </FormField>

        <FormField label="Material" htmlFor="material" error={errors.material?.message}>
          <Input id="material" placeholder="Ceramic, Semi-Metallic" {...register("material")} />
        </FormField>

        <FormField label="Country of Origin" htmlFor="country_of_origin" error={errors.country_of_origin?.message}>
          <Input id="country_of_origin" placeholder="Japan, Thailand" {...register("country_of_origin")} />
        </FormField>
      </CardBody>
    </Card>
  );
}
