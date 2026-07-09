"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/Button";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { ProductFormSchema, PRODUCT_FORM_DEFAULTS, type ProductFormValues } from "@/lib/admin/schemas/productSchema";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import type { PaginatedResponse } from "@/types/api";
import type { Category } from "@/mocks/admin/db";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";

import { BasicInfoCard } from "./BasicInfoCard";
import { BilingualContentCard } from "./BilingualContentCard";
import { PricingCard } from "./PricingCard";
import { InventoryCard } from "./InventoryCard";
import { ImagesCard } from "./ImagesCard";
import { VehicleCompatibilityCard } from "./VehicleCompatibilityCard";
import { SpecificationsCard } from "./SpecificationsCard";
import { SeoCard } from "./SeoCard";
import { PreviewCard } from "./PreviewCard";

function productToFormValues(product: Product): ProductFormValues {
  return {
    sku: product.sku,
    brand_id: product.brand_id,
    category_id: product.category_id ?? 0,
    is_active: product.status === "active",
    name_en: product.name_en,
    name_ar: product.name_ar,
    short_description_en: product.short_description_en,
    short_description_ar: product.short_description_ar,
    description_en: product.description_en,
    description_ar: product.description_ar,
    price: product.price,
    compare_at_price: product.compare_at_price,
    cost_price: product.cost_price,
    vat_inclusive: product.vat_inclusive,
    stock_quantity: product.stock_quantity,
    low_stock_threshold: product.low_stock_threshold ?? 0,
    track_inventory: product.track_inventory,
    images: product.images,
    fits_all_vehicles: product.fits_all_vehicles,
    vehicle_ids: product.vehicle_ids,
    specifications: product.specifications,
    slug: product.slug,
  };
}

export function ProductForm({ mode, product }: { mode: "create" | "edit"; product?: Product }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingIntent, setPendingIntent] = useState<"draft" | "publish" | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: product ? productToFormValues(product) : PRODUCT_FORM_DEFAULTS,
  });

  const categoriesQuery = useAdminQuery<PaginatedResponse<Category>>(
    adminQueryKeys.categories.all,
    "/categories",
    { per_page: 100 }
  );
  const brandsQuery = useAdminQuery<PaginatedResponse<Brand>>(
    adminQueryKeys.brands.all,
    "/brands",
    { per_page: 100 }
  );
  const mediaQuery = useAdminQuery<PaginatedResponse<RawMediaRow>>(
    adminQueryKeys.media.list({ per_page: 100 }),
    "/media",
    { per_page: 100 }
  );
  const categories = categoriesQuery.data?.items ?? [];
  const brands = brandsQuery.data?.items ?? [];
  const mediaById = useMemo(
    () => new Map((mediaQuery.data?.items ?? []).map(toMediaItem).map((m) => [m.id, m])),
    [mediaQuery.data]
  );

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      mode === "edit" && product
        ? adminApi.put<Product>(`/products/${product.id}`, payload)
        : adminApi.post<Product>("/products", payload),
    onSuccess: () => {
      showSuccess(mode === "edit" ? "Product updated" : `Product ${pendingIntent === "draft" ? "saved as draft" : "created"}`);
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.products.list() });
      if (product) queryClient.invalidateQueries({ queryKey: adminQueryKeys.products.detail(product.id) });
      router.push("/admin/products");
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the product."),
    onSettled: () => setPendingIntent(null),
  });

  const buildPayload = (values: ProductFormValues, status: "draft" | "active" | "inactive") => ({
    sku: values.sku,
    brand_id: values.brand_id ?? null,
    category_id: Number(values.category_id),
    name_en: values.name_en,
    name_ar: values.name_ar,
    short_description_en: values.short_description_en ?? "",
    short_description_ar: values.short_description_ar ?? "",
    description_en: values.description_en ?? "",
    description_ar: values.description_ar ?? "",
    price: values.price,
    compare_at_price: values.compare_at_price ?? null,
    cost_price: values.cost_price ?? null,
    vat_inclusive: values.vat_inclusive,
    stock_quantity: values.stock_quantity,
    low_stock_threshold: values.low_stock_threshold,
    track_inventory: values.track_inventory,
    images: values.images,
    fits_all_vehicles: values.fits_all_vehicles,
    vehicle_ids: values.vehicle_ids,
    specifications: values.specifications.filter((s) => s.key_en || s.value_en || s.key_ar || s.value_ar),
    slug: values.slug,
    status,
  });

  const submitAs = (intent: "draft" | "publish") =>
    form.handleSubmit((values) => {
      setPendingIntent(intent);
      const status = intent === "draft" ? "draft" : values.is_active ? "active" : "inactive";
      save.mutate(buildPayload(values, status));
    });

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BasicInfoCard form={form} categories={categories} brands={brands} />
          <BilingualContentCard form={form} />
          <PricingCard form={form} />
          <InventoryCard form={form} />
          <ImagesCard form={form} mediaById={mediaById} />
          <VehicleCompatibilityCard form={form} />
          <SpecificationsCard form={form} />
          <SeoCard form={form} />
        </div>

        <div className="lg:col-span-1">
          <PreviewCard
            form={form}
            categories={categories}
            mediaById={mediaById}
            product={product}
            saving={save.isPending}
            onSaveDraft={submitAs("draft")}
            onPublish={submitAs("publish")}
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-4 shadow-md md:-mx-8 md:px-8">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={submitAs("draft")} loading={save.isPending}>
          Save as Draft
        </Button>
        <Button type="button" onClick={submitAs("publish")} loading={save.isPending}>
          Publish
        </Button>
      </div>
    </form>
  );
}
