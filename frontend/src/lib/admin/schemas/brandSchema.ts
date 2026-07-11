import { z } from "zod";

export const BrandFormSchema = z.object({
  name_en: z.string().min(1, "English name is required."),
  name_ar: z.string().min(1, "Arabic name is required."),
  slug: z.string().min(1, "URL slug is required."),
  logo: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  is_active: z.boolean(),
});

export type BrandFormValues = z.infer<typeof BrandFormSchema>;

export const BRAND_FORM_DEFAULTS: BrandFormValues = {
  name_en: "",
  name_ar: "",
  slug: "",
  logo: null,
  description_en: "",
  description_ar: "",
  is_active: true,
};
