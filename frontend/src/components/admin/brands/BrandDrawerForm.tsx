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
import { Switch } from "@/components/admin/ui/Switch";
import { TranslateLabel } from "@/components/admin/ui/TranslateLabel";
import { SingleImageUpload } from "@/components/admin/ui/SingleImageUpload";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { slugify } from "@/lib/admin/utils";
import { useTranslate } from "@/lib/admin/hooks/useTranslate";
import { BrandFormSchema, BRAND_FORM_DEFAULTS, type BrandFormValues } from "@/lib/admin/schemas/brandSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import type { Brand } from "@/types/brand";

export function BrandDrawerForm({
  open,
  onClose,
  brand,
}: {
  open: boolean;
  onClose: () => void;
  /** Present = editing; absent = creating. */
  brand?: Brand | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!brand;
  const name = useTranslate();
  const description = useTranslate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(BrandFormSchema),
    defaultValues: BRAND_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        brand
          ? {
              name_en: brand.name_en,
              name_ar: brand.name_ar,
              slug: brand.slug,
              logo: brand.logo,
              description_en: brand.description_en,
              description_ar: brand.description_ar,
              is_active: brand.is_active,
            }
          : BRAND_FORM_DEFAULTS
      );
    }
  }, [open, brand, reset]);

  const save = useMutation({
    mutationFn: (values: BrandFormValues) =>
      isEdit && brand ? adminApi.put(`/brands/${brand.id}`, values) : adminApi.post("/brands", values),
    onSuccess: () => {
      showSuccess(isEdit ? "Brand updated" : "Brand created");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.brands.all });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the brand."),
  });

  const translateName = async () => {
    const translated = await name.translate(watch("name_en"));
    if (translated) setValue("name_ar", translated, { shouldValidate: true });
  };

  const translateDescription = async () => {
    const translated = await description.translate(watch("description_en") ?? "");
    if (translated) setValue("description_ar", translated);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Brand" : "Add Brand"}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="brand-form" loading={save.isPending}>
            {isEdit ? "Save Changes" : "Create Brand"}
          </Button>
        </>
      }
    >
      <form id="brand-form" onSubmit={handleSubmit((values) => save.mutate(values), onFormInvalid)} className="space-y-4">
        <FormField label="Name (EN)" htmlFor="brand-name-en" error={errors.name_en?.message} required>
          <Input
            id="brand-name-en"
            {...register("name_en")}
            onBlur={(e) => {
              if (!watch("slug")) setValue("slug", slugify(e.target.value));
              if (!isEdit && !watch("name_ar")) translateName();
            }}
          />
        </FormField>

        <FormField
          label={
            <TranslateLabel
              label="الاسم (AR)"
              translating={name.translating}
              disabled={!watch("name_en").trim()}
              onTranslate={translateName}
            />
          }
          htmlFor="brand-name-ar"
          error={errors.name_ar?.message}
        >
          <Input id="brand-name-ar" dir="rtl" {...register("name_ar")} />
        </FormField>

        <FormField label="URL Slug" htmlFor="brand-slug" error={errors.slug?.message} required>
          <Input id="brand-slug" {...register("slug")} />
        </FormField>

        <FormField label="Logo">
          <SingleImageUpload value={watch("logo")} onChange={(url) => setValue("logo", url, { shouldDirty: true })} />
        </FormField>

        <FormField label="Description (EN)" htmlFor="brand-desc-en">
          <Textarea id="brand-desc-en" rows={2} {...register("description_en")} />
        </FormField>

        <FormField
          label={
            <TranslateLabel
              label="الوصف (AR)"
              translating={description.translating}
              disabled={!watch("description_en")?.trim()}
              onTranslate={translateDescription}
            />
          }
          htmlFor="brand-desc-ar"
        >
          <Textarea id="brand-desc-ar" dir="rtl" rows={2} {...register("description_ar")} />
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
