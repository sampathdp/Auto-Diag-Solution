"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Select } from "@/components/admin/ui/Select";
import { Switch } from "@/components/admin/ui/Switch";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { slugify } from "@/lib/admin/utils";
import {
  CategoryFormSchema,
  CATEGORY_FORM_DEFAULTS,
  type CategoryFormValues,
} from "@/lib/admin/schemas/categorySchema";
import type { Category } from "@/mocks/admin/db";

export function CategoryDrawerForm({
  open,
  onClose,
  category,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  /** Present = editing; absent = creating. */
  category?: Category | null;
  categories: Category[];
}) {
  const queryClient = useQueryClient();
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: CATEGORY_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        category
          ? {
              name_en: category.name_en,
              name_ar: category.name_ar,
              slug: category.slug,
              parent_id: category.parent_id,
              image: category.image,
              description_en: category.description_en,
              description_ar: category.description_ar,
              is_active: category.is_active,
            }
          : CATEGORY_FORM_DEFAULTS
      );
    }
  }, [open, category, reset]);

  const save = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = { ...values, parent_id: values.parent_id || null };
      return isEdit && category
        ? adminApi.put(`/categories/${category.id}`, payload)
        : adminApi.post("/categories", { ...payload, sort_order: categories.length });
    },
    onSuccess: () => {
      showSuccess(isEdit ? "Category updated" : "Category created");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.categories.all });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the category."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Category" : "Add Category"}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={save.isPending}>
            {isEdit ? "Save Changes" : "Create Category"}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={handleSubmit((values) => save.mutate(values))}
        className="space-y-4"
      >
        <FormField label="Name (EN)" htmlFor="cat-name-en" error={errors.name_en?.message} required>
          <Input
            id="cat-name-en"
            {...register("name_en")}
            onBlur={(e) => {
              if (!watch("slug")) setValue("slug", slugify(e.target.value));
            }}
          />
        </FormField>

        <FormField label="الاسم (AR)" htmlFor="cat-name-ar" error={errors.name_ar?.message} required>
          <Input id="cat-name-ar" dir="rtl" {...register("name_ar")} />
        </FormField>

        <FormField label="URL Slug" htmlFor="cat-slug" error={errors.slug?.message} required>
          <Input id="cat-slug" {...register("slug")} />
        </FormField>

        <FormField label="Parent Category" htmlFor="cat-parent">
          <Select
            id="cat-parent"
            value={watch("parent_id") ?? ""}
            onChange={(e) => setValue("parent_id", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">None (top level)</option>
            {categories
              .filter((c) => !c.parent_id && c.id !== category?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
          </Select>
        </FormField>

        <FormField label="Image URL" htmlFor="cat-image" helperText="Optional — paste a media URL.">
          <Input id="cat-image" value={watch("image") ?? ""} onChange={(e) => setValue("image", e.target.value || null)} />
        </FormField>

        <FormField label="Description (EN)" htmlFor="cat-desc-en">
          <Textarea id="cat-desc-en" rows={2} {...register("description_en")} />
        </FormField>

        <FormField label="الوصف (AR)" htmlFor="cat-desc-ar">
          <Textarea id="cat-desc-ar" dir="rtl" rows={2} {...register("description_ar")} />
        </FormField>

        <FormField label="Status">
          <Switch
            label={watch("is_active") ? "Active" : "Inactive"}
            checked={watch("is_active")}
            onChange={(e) => setValue("is_active", e.target.checked)}
          />
        </FormField>

      </form>
    </Drawer>
  );
}
