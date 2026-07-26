export type VehicleFitment = {
  year_from: number;
  year_to: number;
  make: string;
  model: string;
  chassis_code: string | null;
  vin_note: string | null;
};

export type Category = {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
};

export type Brand = {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
};

export type Specification = {
  key_en: string;
  key_ar: string;
  value_en: string;
  value_ar: string;
};

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name_en: string;
  name_ar: string;
  short_description_en: string | null;
  short_description_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  brand: { name_en: string; name_ar: string; slug: string } | null;
  category: { name_en: string; name_ar: string; slug: string } | null;
  part_type: "genuine" | "aftermarket" | "oem" | null;
  oem_part_number: string | null;
  material: string | null;
  country_of_origin: string | null;
  price_aed: number;
  compare_at_price: number | null;
  vat_inclusive: boolean;
  images: string[];
  stock: number;
  stock_status: "in_stock" | "out_of_stock" | "backorder";
  fits_all_vehicles: boolean;
  free_shipping: boolean;
  compatible_vehicles: VehicleFitment[];
  rating: number;
  reviews: number;
  specifications?: Specification[];
  /** Only present on the single-product endpoint (used for SEO metadata/schema). */
  cross_reference_numbers?: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string[];
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  fits_year?: string;
  fits_make?: string;
  fits_model?: string;
  rating?: number;
  sort?: "price_asc" | "price_desc" | "newest" | "name_asc";
  page?: number;
  per_page?: number;
  ids?: string[];
};
