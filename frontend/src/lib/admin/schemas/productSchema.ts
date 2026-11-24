import { z } from "zod";

export const ProductSpecificationSchema = z.object({
  key_en: z.string(),
  key_ar: z.string(),
  value_en: z.string(),
  value_ar: z.string(),
});

const CURRENT_YEAR_PLUS_TWO = new Date().getFullYear() + 2;

// .coerce on year_from/year_to for the same reason as images/vehicle_ids above — the
// live backend's PDO driver returns numeric columns as JSON strings.
export const ProductFitmentSchema = z
  .object({
    make: z.string().min(1, "Make is required."),
    model: z.string().min(1, "Model is required."),
    // Nullable — most parts fit every generation of a model, so leaving this blank
    // (matching by year range alone) is the common case, not the exception.
    chassis_code: z.string().nullable().optional(),
    year_from: z.coerce
      .number({ invalid_type_error: "Enter a start year." })
      .int()
      .min(1980, "Year must be 1980 or later.")
      .max(CURRENT_YEAR_PLUS_TWO, `Year can't be later than ${CURRENT_YEAR_PLUS_TWO}.`),
    year_to: z.coerce
      .number({ invalid_type_error: "Enter an end year." })
      .int()
      .min(1980, "Year must be 1980 or later.")
      .max(CURRENT_YEAR_PLUS_TWO, `Year can't be later than ${CURRENT_YEAR_PLUS_TWO}.`),
    vin_note: z.string().nullable().optional(),
  })
  .refine((data) => data.year_to >= data.year_from, {
    message: "Year to can't be before the start year.",
    path: ["year_to"],
  });

export const ProductFormSchema = z
  .object({
    sku: z.string().min(1, "SKU is required."),
    // Nullable, not required — the real backend's brand_id is an optional FK (not
    // every part has a well-known brand), unlike the mock's required free-text
    // brand_name.
    brand_id: z.coerce.number({ invalid_type_error: "Select a brand." }).int().positive("Select a brand.").nullable(),
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
    compare_at_price: z.coerce
      .number({ invalid_type_error: "Enter a valid compare-at price." })
      .nonnegative("Compare-at price can't be negative.")
      .nullable()
      .optional(),
    // Renamed from the mock's `cost` to match the real backend's `cost_price` column.
    cost_price: z.coerce
      .number({ invalid_type_error: "Enter a valid cost price." })
      .nonnegative("Cost price can't be negative.")
      .nullable()
      .optional(),
    // B2B dealer price: required on every product, > 0 and not above the retail price
    // (same rules as ProductService::applyWholesale). Admins without the
    // b2b.pricing.manage permission see it read-only and the server keeps the stored value.
    wholesale_price: z.preprocess(
      (v) => (v === "" || v == null || (typeof v === "number" && Number.isNaN(v)) ? null : Number(v)),
      z.number({ invalid_type_error: "Enter a wholesale price." }).positive("Wholesale price must be greater than 0.").nullable()
    ),
    wholesale_min_qty: z.preprocess(
      (v) => (v === "" || v == null || (typeof v === "number" && Number.isNaN(v)) ? null : Number(v)),
      z.number({ invalid_type_error: "Enter a whole number." }).int("Enter a whole number.").min(1, "Minimum quantity is at least 1.").nullable()
    ),
    vat_inclusive: z.boolean(),

    stock_quantity: z.coerce
      .number({ invalid_type_error: "Enter a stock quantity." })
      .int()
      .nonnegative("Stock can't be negative."),
    low_stock_threshold: z.coerce
      .number({ invalid_type_error: "Enter a low-stock threshold." })
      .int()
      .nonnegative("Threshold can't be negative."),
    track_inventory: z.boolean(),
    // Empty input -> null. Required by Fulfillor to create a product, so it's enforced
    // below for source='3pl' products.
    weight_kg: z.preprocess(
      (v) => (v === "" || v == null || (typeof v === "number" && Number.isNaN(v)) ? null : Number(v)),
      z.number({ invalid_type_error: "Enter a valid weight." }).positive("Weight must be more than 0.").nullable()
    ),

    // .coerce: the live backend's PDO driver returns every numeric column as a JSON
    // string ("8", not 8) — a shared-hosting/local-dev PHP driver difference, not a
    // per-field quirk. Every id-shaped field needs this, not just scalars like
    // category_id/brand_id above.
    images: z.array(z.coerce.number()),

    // Nullable — a part's Genuine/Aftermarket/OEM classification isn't always known
    // up front, unlike category/brand which the catalog requires.
    part_type: z.enum(["genuine", "aftermarket", "oem"]).nullable(),
    oem_part_number: z.string().nullable().optional(),
    fulfillor_product_id: z.string().nullable().optional(),
    // '3pl' = stocked at Fulfillor: auto-created/updated there on every save.
    source: z.enum(["local", "3pl"]),
    material: z.string().nullable().optional(),
    country_of_origin: z.string().nullable().optional(),

    fits_all_vehicles: z.boolean(),
    free_shipping: z.boolean(),
    fitments: z.array(ProductFitmentSchema),

    specifications: z.array(ProductSpecificationSchema),
    // useFieldArray needs an object per row (for its internal id), so a single
    // "cross number" field is still wrapped as { value } — unwrapped to string[] on
    // submit and re-wrapped from the server's string[] when loading an existing product.
    cross_reference_numbers: z.array(z.object({ value: z.string().min(1, "Cross number is required.") })),

    slug: z.string().min(1, "URL slug is required."),
    // seo_title_en/ar and seo_description_en/ar removed — the backend has no
    // product-level SEO columns at all (SEO is the separate SeoMeta entity,
    // page_type='product'). Per-product SEO overrides belong on the general SEO
    // management page (Phase F7), not embedded in this form. See ARCHITECTURE.md §8.7.
  })
  .refine((data) => data.compare_at_price == null || data.compare_at_price > data.price, {
    message: "Compare-at price must be higher than the price.",
    path: ["compare_at_price"],
  })
  .refine((data) => data.wholesale_price != null, {
    message: "Wholesale price is required.",
    path: ["wholesale_price"],
  })
  .refine((data) => data.wholesale_price == null || data.wholesale_price <= data.price, {
    message: "Wholesale price can't be higher than the retail price.",
    path: ["wholesale_price"],
  })
  .refine((data) => data.source !== "3pl" || data.weight_kg != null, {
    message: "Weight is required for products sent to the 3PL.",
    path: ["weight_kg"],
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
  wholesale_price: null,
  wholesale_min_qty: null,
  vat_inclusive: true,
  stock_quantity: 0,
  low_stock_threshold: 5,
  weight_kg: null,
  track_inventory: true,
  images: [],
  part_type: null,
  oem_part_number: "",
  fulfillor_product_id: "",
  source: "3pl",
  material: "",
  country_of_origin: "",
  fits_all_vehicles: false,
  free_shipping: false,
  fitments: [],
  specifications: [],
  cross_reference_numbers: [],
  slug: "",
};
