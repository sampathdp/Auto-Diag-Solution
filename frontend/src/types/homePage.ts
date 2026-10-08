export const WHY_ICONS = ["ShieldCheck", "Truck", "MessageCircle", "RotateCcw"] as const;
export type WhyIcon = (typeof WHY_ICONS)[number];

// Bilingual text fields are stored as <name>_en / <name>_ar.
type Fields = Record<string, string>;

export interface HomeStatItem {
  value_en: string;
  value_ar: string;
  label_en: string;
  label_ar: string;
}

export interface HomeWhyItem {
  icon: WhyIcon;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
}

export interface HomePage {
  hero: Fields & { images?: string[] };
  stats: { items: HomeStatItem[] };
  about: Fields & { images?: string[] };
  categories: Fields;
  products: Fields;
  brands: Fields;
  why: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    items: HomeWhyItem[];
  };
  cta: Fields;
  updated_at: string;
}
