/**
 * Real backend shape for a brand (backend/app/Services/BrandService.php).
 * There is no standalone Brands admin page (see ARCHITECTURE.md §8.6) — this type
 * exists only to back the brand picker in the product form.
 */
export interface Brand {
  id: number;
  name_en: string;
  name_ar: string;
  slug: string;
  logo: string | null;
  description_en: string | null;
  description_ar: string | null;
  is_active: boolean;
  products_count?: number;
  created_at: string;
  updated_at: string;
}
