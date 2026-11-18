/**
 * Real backend shape for a product (backend/app/Services/ProductService.php),
 * replacing the mock Product type for anywhere real API data flows. Differs from
 * the mock in several ways the admin UI was originally built against:
 * brand_id (FK) instead of brand_name (free text), cost_price instead of cost,
 * no product-level SEO fields (SEO is the separate SeoMeta entity — see
 * ARCHITECTURE.md §8.7), and status/stock_status as the real enums.
 */
export interface ProductSpecification {
  key_en: string;
  key_ar: string;
  value_en: string;
  value_ar: string;
}

export interface ProductFitment {
  id?: number;
  make: string;
  model: string;
  chassis_code: string | null;
  year_from: number;
  year_to: number;
  vin_note: string | null;
}

export interface Product {
  id: number;
  category_id: number | null;
  brand_id: number | null;
  supplier_id: number | null;
  sku: string;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string | null;
  description_ar: string | null;
  short_description_en: string | null;
  short_description_ar: string | null;
  price: number;
  vat_inclusive: boolean;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  track_inventory: boolean;
  stock_status: "in_stock" | "out_of_stock" | "backorder";
  images: number[];
  weight_kg: number | null;
  part_type: "genuine" | "aftermarket" | "oem" | null;
  oem_part_number: string | null;
  fulfillor_product_id?: string | null;
  /** Last automatic push to Fulfillor (source='3pl' products only) — see FulfillmentService::syncProduct. */
  fulfillor_synced_at?: string | null;
  fulfillor_sync_error?: string | null;
  material: string | null;
  country_of_origin: string | null;
  source: "local" | "3pl";
  source_supplier_id: string | null;
  source_synced_at: string | null;
  status: "draft" | "active" | "inactive";
  fits_all_vehicles: boolean;
  free_shipping: boolean;
  created_at: string;
  updated_at: string;
  specifications: ProductSpecification[];
  fitments: ProductFitment[];
  cross_reference_numbers: string[];
  /** Only present on list rows (LEFT JOINed), not on a single GET /products/{id}. */
  category_name_en?: string | null;
  brand_name_en?: string | null;
}
