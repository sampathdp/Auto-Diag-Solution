export interface AboutValueItem {
  icon: "ShieldCheck" | "Target" | "PackageCheck" | "MessageCircle";
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
}

export interface AboutMilestoneItem {
  year_en: string;
  year_ar: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
}

export interface AboutPage {
  hero: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    subtitle_en: string;
    subtitle_ar: string;
    crumb_en: string;
    crumb_ar: string;
  };
  story: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    body1_en: string;
    body1_ar: string;
    body2_en: string;
    body2_ar: string;
    image_tag_en: string;
    image_tag_ar: string;
    image_url: string;
  };
  values: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    items: AboutValueItem[];
  };
  timeline: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    items: AboutMilestoneItem[];
  };
  updated_at: string;
}
