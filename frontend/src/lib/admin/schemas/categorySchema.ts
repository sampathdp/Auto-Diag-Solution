import { z } from "zod";

export const CategoryFormSchema = z.object({
  name_en: z.string().min(1, "English name is required."),
  name_ar: z.string().min(1, "Arabic name is required."),
  slug: z.string().min(1, "URL slug is required."),
  // .coerce: the live backend's PDO driver returns numeric columns as JSON strings
  // ("8", not 8) — see productSchema.ts's images/vehicle_ids for the same fix.
  parent_id: z.coerce.number().nullable(),
  image: z.string().nullable(),
  // Nullable, not just optional — the real backend returns `null` (not `undefined`)
  // for an unset optional text column, and a plain .optional() zod string schema
  // rejects `null`, which silently blocked form submission entirely (no network
  // call, no visible error) whenever editing a category with no description set.
  description_en: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  is_active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

export const CATEGORY_FORM_DEFAULTS: CategoryFormValues = {
  name_en: "",
  name_ar: "",
  slug: "",
  parent_id: null,
  image: null,
  description_en: "",
  description_ar: "",
  is_active: true,
};
