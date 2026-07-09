/** Real backend shape (backend/app/Services/SeoMetaService.php). */
export interface SeoMeta {
  id: number;
  page_type: "page" | "category" | "product" | "custom";
  reference_id: number | null;
  path: string;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  /** A plain URL/path, not a media id — unlike the mock's og_image_media_id. */
  og_image: string | null;
  created_at: string;
  updated_at: string;
}
