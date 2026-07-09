import type { Category } from "@/mocks/admin/db";
import type { Product } from "@/types/product";
import type { Page } from "@/types/page";
import type { SeoMeta } from "@/types/seo";

export interface SeoRow {
  key: string;
  page_type: SeoMeta["page_type"];
  reference_id: number | null;
  path: string;
  name: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  og_image: string | null;
  /** Present once a custom override has been saved for this route. */
  overrideId?: number;
}

/**
 * `seoMeta` only stores custom overrides. This merges those overrides with
 * computed defaults for every route on the storefront (home, categories,
 * products, CMS pages) so the SEO Manager always lists everything, whether
 * or not it's been customized yet.
 *
 * Products and pages have no seo_title_en/seo_description_en columns on the real
 * backend at all (unlike the mock) — SEO is entirely this separate entity — so
 * their defaults are computed from name/title instead of read off the entity.
 */
export function buildSeoRows(
  seoMeta: SeoMeta[],
  categories: Category[],
  products: Product[],
  pages: Page[]
): SeoRow[] {
  const overrideByPath = new Map(seoMeta.map((s) => [s.path, s]));

  const home = overrideByPath.get("/");
  const rows: SeoRow[] = [
    {
      key: "custom:/",
      page_type: "custom",
      reference_id: null,
      path: "/",
      name: "Homepage",
      title_en: home?.meta_title_en ?? "Auto Parts UAE",
      title_ar: home?.meta_title_ar ?? "قطع غيار السيارات الإمارات",
      description_en: home?.meta_description_en ?? "",
      description_ar: home?.meta_description_ar ?? "",
      og_image: home?.og_image ?? null,
      overrideId: home?.id,
    },
  ];

  for (const c of categories) {
    const path = `/category/${c.slug}`;
    const override = overrideByPath.get(path);
    rows.push({
      key: `category:${c.id}`,
      page_type: "category",
      reference_id: c.id,
      path,
      name: c.name_en,
      title_en: override?.meta_title_en ?? `${c.name_en} | Auto Parts UAE`,
      title_ar: override?.meta_title_ar ?? `${c.name_ar} | قطع غيار السيارات الإمارات`,
      description_en: override?.meta_description_en ?? c.description_en ?? "",
      description_ar: override?.meta_description_ar ?? c.description_ar ?? "",
      og_image: override?.og_image ?? null,
      overrideId: override?.id,
    });
  }

  for (const p of products) {
    const path = `/product/${p.slug}`;
    const override = overrideByPath.get(path);
    rows.push({
      key: `product:${p.id}`,
      page_type: "product",
      reference_id: p.id,
      path,
      name: p.name_en,
      title_en: override?.meta_title_en ?? `${p.name_en} | Auto Parts UAE`,
      title_ar: override?.meta_title_ar ?? `${p.name_ar} | قطع غيار السيارات الإمارات`,
      description_en: override?.meta_description_en ?? p.short_description_en ?? "",
      description_ar: override?.meta_description_ar ?? p.short_description_ar ?? "",
      og_image: override?.og_image ?? null,
      overrideId: override?.id,
    });
  }

  for (const pg of pages) {
    const path = `/${pg.slug}`;
    const override = overrideByPath.get(path);
    rows.push({
      key: `page:${pg.id}`,
      page_type: "page",
      reference_id: pg.id,
      path,
      name: pg.title_en,
      title_en: override?.meta_title_en ?? `${pg.title_en} | Auto Parts UAE`,
      title_ar: override?.meta_title_ar ?? `${pg.title_ar} | قطع غيار السيارات الإمارات`,
      description_en: override?.meta_description_en ?? "",
      description_ar: override?.meta_description_ar ?? "",
      og_image: override?.og_image ?? null,
      overrideId: override?.id,
    });
  }

  return rows;
}
