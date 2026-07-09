import { z } from "zod";

/**
 * Real backend Page (backend/app/Services/PageService.php) has no `visibility` or
 * `seo_*` columns at all — SEO for a page is managed separately via the SeoMeta
 * entity (`page_type: 'page'`, see the SEO Manager, ARCHITECTURE.md §8.8) — and
 * `is_published` is a plain boolean, not a 3-state enum, so there's no "draft"
 * value distinct from "not published".
 */
export const PageFormSchema = z.object({
  title_en: z.string().min(1, "English title is required."),
  title_ar: z.string().min(1, "Arabic title is required."),
  slug: z.string().min(1, "URL slug is required."),
  content_en: z.string().nullable().optional(),
  content_ar: z.string().nullable().optional(),
  is_published: z.boolean(),
});

export type PageFormValues = z.infer<typeof PageFormSchema>;

export const PAGE_FORM_DEFAULTS: PageFormValues = {
  title_en: "",
  title_ar: "",
  slug: "",
  content_en: "",
  content_ar: "",
  is_published: false,
};
