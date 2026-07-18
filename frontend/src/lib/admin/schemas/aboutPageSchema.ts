import { z } from "zod";

const valueItemSchema = z.object({
  icon: z.enum(["ShieldCheck", "Target", "PackageCheck", "MessageCircle"]),
  title_en: z.string().min(1, "Required"),
  title_ar: z.string().min(1, "Required"),
  body_en: z.string().min(1, "Required"),
  body_ar: z.string().min(1, "Required"),
});

const milestoneItemSchema = z.object({
  year_en: z.string().min(1, "Required"),
  year_ar: z.string().min(1, "Required"),
  title_en: z.string().min(1, "Required"),
  title_ar: z.string().min(1, "Required"),
  body_en: z.string().min(1, "Required"),
  body_ar: z.string().min(1, "Required"),
});

export const AboutPageFormSchema = z.object({
  hero: z.object({
    eyebrow_en: z.string(),
    eyebrow_ar: z.string(),
    title_en: z.string().min(1, "English title is required."),
    title_ar: z.string().min(1, "Arabic title is required."),
    subtitle_en: z.string(),
    subtitle_ar: z.string(),
    crumb_en: z.string(),
    crumb_ar: z.string(),
  }),
  story: z.object({
    eyebrow_en: z.string(),
    eyebrow_ar: z.string(),
    title_en: z.string(),
    title_ar: z.string(),
    body1_en: z.string(),
    body1_ar: z.string(),
    body2_en: z.string(),
    body2_ar: z.string(),
    image_tag_en: z.string(),
    image_tag_ar: z.string(),
    image_url: z.string().min(1, "Story image is required."),
  }),
  values: z.object({
    eyebrow_en: z.string(),
    eyebrow_ar: z.string(),
    title_en: z.string(),
    title_ar: z.string(),
    items: z.array(valueItemSchema).length(4),
  }),
  timeline: z.object({
    eyebrow_en: z.string(),
    eyebrow_ar: z.string(),
    title_en: z.string(),
    title_ar: z.string(),
    items: z.array(milestoneItemSchema).length(4),
  }),
});

export type AboutPageFormValues = z.infer<typeof AboutPageFormSchema>;

export const ICON_OPTIONS = ["ShieldCheck", "Target", "PackageCheck", "MessageCircle"] as const;
