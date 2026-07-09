/**
 * Real backend shape (backend/app/Services/PageService.php). Minimal for now —
 * only what Phase F7 (Settings' legal-page picker, SEO row defaults) needs. Phase
 * F8 owns the full CMS Pages admin page and can extend this without re-deriving it.
 */
export interface Page {
  id: number;
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string | null;
  content_ar: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
