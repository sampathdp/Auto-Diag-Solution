"use client";

import type { UseFormReturn } from "react-hook-form";
import { Wand2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Button } from "@/components/admin/ui/Button";
import { slugify } from "@/lib/admin/utils";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

/**
 * SEO title/description fields were dropped — the backend has no product-level SEO
 * columns at all (SEO is the separate SeoMeta entity, page_type='product'). Only
 * `slug` is a real product field. Per-product SEO overrides belong on the general
 * SEO management page (Phase F7) instead. See ARCHITECTURE.md §8.7.
 */
export function SeoCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const generateSlug = () => {
    setValue("slug", slugify(getValues("name_en")), { shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-h4 font-bold text-ink">URL</h2>
        <Button type="button" variant="secondary" size="sm" onClick={generateSlug}>
          <Wand2 className="h-3.5 w-3.5" />
          Generate from Name
        </Button>
      </CardHeader>
      <CardBody>
        <FormField label="URL Slug" htmlFor="slug" error={errors.slug?.message} required>
          <Input id="slug" {...register("slug")} />
        </FormField>
      </CardBody>
    </Card>
  );
}
