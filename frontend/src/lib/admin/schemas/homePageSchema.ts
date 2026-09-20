import { z } from "zod";
import { WHY_ICONS } from "@/types/homePage";

const text = z.record(z.string(), z.string());

const statItemSchema = z.object({
  value_en: z.string().min(1, "Required"),
  value_ar: z.string().min(1, "Required"),
  label_en: z.string().min(1, "Required"),
  label_ar: z.string().min(1, "Required"),
});

const whyItemSchema = z.object({
  icon: z.enum(WHY_ICONS),
  title_en: z.string().min(1, "Required"),
  title_ar: z.string().min(1, "Required"),
  body_en: z.string().min(1, "Required"),
  body_ar: z.string().min(1, "Required"),
});

export const HomePageFormSchema = z.object({
  hero: text,
  stats: z.object({ items: z.array(statItemSchema).length(4) }),
  about: z.object({ images: z.array(z.string()).max(3).optional() }).passthrough(),
  categories: text,
  products: text,
  brands: text,
  why: z.object({
    eyebrow_en: z.string(),
    eyebrow_ar: z.string(),
    title_en: z.string(),
    title_ar: z.string(),
    items: z.array(whyItemSchema).length(4),
  }),
  cta: text,
});

export type HomePageFormValues = z.infer<typeof HomePageFormSchema>;
