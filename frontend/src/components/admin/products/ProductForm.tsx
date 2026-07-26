"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { Button } from "@/components/admin/ui/Button";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { ProductFormSchema, PRODUCT_FORM_DEFAULTS, type ProductFormValues } from "@/lib/admin/schemas/productSchema";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import { slugify } from "@/lib/admin/utils";
import { onFormInvalid } from "@/lib/admin/formErrors";
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
import { CrossReferenceCard } from "./CrossReferenceCard";
import { SeoCard } from "./SeoCard";
import { PreviewModal } from "./PreviewModal";

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
    part_type: product.part_type,
    oem_part_number: product.oem_part_number,
    material: product.material,
    country_of_origin: product.country_of_origin,
    fits_all_vehicles: product.fits_all_vehicles,
    free_shipping: product.free_shipping,
    fitments: product.fitments,
    specifications: product.specifications,
    cross_reference_numbers: product.cross_reference_numbers.map((value) => ({ value })),
    slug: product.slug,
  };
}

export function ProductForm({ mode, product }: { mode: "create" | "edit"; product?: Product }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingIntent, setPendingIntent] = useState<"draft" | "publish" | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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
    onSuccess: (saved) => {
      showSuccess(mode === "edit" ? "Product updated" : `Product ${pendingIntent === "draft" ? "saved as draft" : "created"}`);
      // Write the server's response straight into the cache instead of just
      // invalidating: invalidate only schedules a background refetch, and the
      // router.push right below unmounts this page before that refetch can land,
      // so React Query discards the result and the next visit to the edit page
      // serves the pre-save (stale) product until a hard reload rebuilds the cache.
      queryClient.setQueryData(adminQueryKeys.products.detail(saved.id), saved);
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.products.list() });
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
    part_type: values.part_type ?? null,
    oem_part_number: values.oem_part_number ?? null,
    material: values.material ?? null,
    country_of_origin: values.country_of_origin ?? null,
    fits_all_vehicles: values.fits_all_vehicles,
    free_shipping: values.free_shipping,
    fitments: values.fitments.filter((f) => f.make || f.model),
    specifications: values.specifications.filter((s) => s.key_en || s.value_en || s.key_ar || s.value_ar),
    cross_reference_numbers: values.cross_reference_numbers.map((r) => r.value).filter(Boolean),
    slug: values.slug,
    status,
  });

  // NOTE: submitAs(intent) is invoked at render time (onClick={submitAs("draft")}) to
  // produce the actual click handler — any side effect must live inside the returned
  // function, not in submitAs's own body, or it'd re-run on every render.
  const submitAs = (intent: "draft" | "publish") => () => {
    // The URL slug lives on the SEO card, below the fold — easy to never scroll to.
    // Fall back to deriving it from the English name instead of leaving it blank and
    // failing validation on a field the user never saw.
    if (!form.getValues("slug")) {
      form.setValue("slug", slugify(form.getValues("name_en")), { shouldDirty: true });
    }

    return form.handleSubmit((values) => {
      setPendingIntent(intent);
      const status = intent === "draft" ? "draft" : values.is_active ? "active" : "inactive";
      save.mutate(buildPayload(values, status));
    }, onFormInvalid)();
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-6">
        <BasicInfoCard form={form} categories={categories} brands={brands} />
        <BilingualContentCard form={form} />
        <PricingCard form={form} />
        <InventoryCard form={form} />
        <ImagesCard form={form} mediaById={mediaById} />
        <VehicleCompatibilityCard form={form} />
        <CrossReferenceCard form={form} />
        <SpecificationsCard form={form} />
        <SeoCard form={form} />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-between gap-2 border-t border-border bg-surface px-4 py-4 shadow-md md:-mx-8 md:px-8">
        <Button type="button" variant="ghost" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <div className="flex items-center gap-2">
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
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        form={form}
        categories={categories}
        mediaById={mediaById}
        product={product}
        saving={save.isPending}
        onSaveDraft={submitAs("draft")}
        onPublish={submitAs("publish")}
      />
    </form>
  );
}
