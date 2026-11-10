import { cache } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  hours: string;
  blurb?: string;
  whatsapp?: string;
}

// Admin-editable contact details (Admin > Settings > Contact Info). Each value falls
// back to the built-in default when the API is unreachable or the field is empty.
export const getContactInfo = cache(async (locale: string, fallback: ContactInfo): Promise<ContactInfo> => {
  try {
    const res = await fetch(`${API_BASE_URL}/announcement`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    const d = ((await res.json())?.data ?? {}) as Record<string, string>;
    const l = locale === "ar" ? "ar" : "en";
    const pick = (v: string | undefined, f: string) => (v && v.trim() ? v : f);
    return {
      address: pick(d[`contact_address_${l}`], fallback.address),
      phone: pick(d.contact_phone, fallback.phone),
      email: pick(d.contact_email, fallback.email),
      hours: pick(d[`contact_hours_${l}`], fallback.hours),
      blurb: pick(d[`contact_blurb_${l}`], fallback.blurb || ""),
      whatsapp: pick(d.whatsapp_number, fallback.whatsapp || ""),
    };
  } catch {
    return fallback;
  }
});

export interface FooterLink {
  href: string;
  label: string;
}

// Footer legal links follow the CMS pages: label = page title in the active locale,
// href = the page's current slug. Falls back to the built-in link/label per page.
export const getFooterPageLinks = cache(
  async (locale: string, fallback: Record<"terms" | "refund" | "privacy", FooterLink>) => {
    try {
      const res = await fetch(`${API_BASE_URL}/footer-pages`, { next: { revalidate: 60 } });
      if (!res.ok) return fallback;
      const d = ((await res.json())?.data ?? {}) as Record<string, { slug: string; title_en: string; title_ar: string }>;
      const out = { ...fallback };
      for (const key of ["terms", "refund", "privacy"] as const) {
        const p = d[key];
        if (!p) continue;
        const title = locale === "ar" ? p.title_ar : p.title_en;
        out[key] = { href: `/${p.slug}`, label: title?.trim() || fallback[key].label };
      }
      return out;
    } catch {
      return fallback;
    }
  }
);
