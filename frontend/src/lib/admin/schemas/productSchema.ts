import { z } from "zod";

export const ProductSpecificationSchema = z.object({
  key_en: z.string(),
  key_ar: z.string(),
  value_en: z.string(),
  value_ar: z.string(),
});

export const ProductFormSchema = z
  .object({
    sku: z.string().min(1, "SKU is required."),
    // Nullable, not required — the real backend's brand_id is an optional FK (not
    // every part has a well-known brand), unlike the mock's required free-text
    // brand_name.
    brand_id: z.coerce.number().int().positive().nullable(),
    category_id: z.coerce.number({ invalid_type_error: "Select a category." }).min(1, "Select a category."),
    is_active: z.boolean(),

    name_en: z.string().min(1, "English name is required."),
    name_ar: z.string().min(1, "Arabic name is required."),
    // Nullable, not just optional — the real backend returns `null` (not
    // `undefined`) for an unset optional text column. A plain .optional() zod
    // string schema rejects `null` and silently blocks submission with no visible
    // error (the exact bug found and fixed for categories in Phase F2/§8.3).
    short_description_en: z.string().nullable().optional(),
    short_description_ar: z.string().nullable().optional(),
    description_en: z.string().nullable().optional(),
    description_ar: z.string().nullable().optional(),

    price: z.coerce.number({ invalid_type_error: "Enter a price." }).positive("Price must be greater than 0."),
    compare_at_price: z.coerce.number().nonnegative().nullable().optional(),
    // Renamed from the mock's `cost` to match the real backend's `cost_price` column.
    cost_price: z.coerce.number().nonnegative().nullable().optional(),
    vat_inclusive: z.boolean(),

    stock_quantity: z.coerce.number().int().nonnegative("Stock can't be negative."),
    low_stock_threshold: z.coerce.number().int().nonnegative("Threshold can't be negative."),
    track_inventory: z.boolean(),

    images: z.array(z.number()),

    fits_all_vehicles: z.boolean(),
    vehicle_ids: z.array(z.number()),

    specifications: z.array(ProductSpecificationSchema),

    slug: z.string().min(1, "URL slug is required."),
    // seo_title_en/ar and seo_description_en/ar removed — the backend has no
    // product-level SEO columns at all (SEO is the separate SeoMeta entity,
    // page_type='product'). Per-product SEO overrides belong on the general SEO
    // management page (Phase F7), not embedded in this form. See ARCHITECTURE.md §8.7.
  })
  .refine((data) => data.compare_at_price == null || data.compare_at_price > data.price, {
    message: "Compare-at price must be higher than the price.",
    path: ["compare_at_price"],
  });

export type ProductFormValues = z.infer<typeof ProductFormSchema>;

export const PRODUCT_FORM_DEFAULTS: ProductFormValues = {
  sku: "",
  brand_id: null,
  category_id: 0,
  is_active: true,
  name_en: "",
  name_ar: "",
  short_description_en: "",
  short_description_ar: "",
  description_en: "",
  description_ar: "",
  price: 0,
  compare_at_price: null,
  cost_price: null,
  vat_inclusive: true,
  stock_quantity: 0,
  low_stock_threshold: 5,
  track_inventory: true,
  images: [],
  fits_all_vehicles: false,
  vehicle_ids: [],
  specifications: [],
  slug: "",
};
