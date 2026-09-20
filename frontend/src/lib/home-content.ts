import { cache } from "react";
import type { HomePage } from "@/types/homePage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// Admin-editable home page copy. Returns null when the API is unreachable or not
// seeded yet — callers then fall back to the built-in translation strings.
export const getHomeContent = cache(async (): Promise<HomePage | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/home-page`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as HomePage | null;
  } catch {
    return null;
  }
});

// Picks `<key>_<locale>` from a CMS section, falling back when empty or missing.
export function cms(section: object | undefined, key: string, locale: string, fallback: string): string {
  const value = (section as Record<string, unknown> | undefined)?.[`${key}_${locale === "ar" ? "ar" : "en"}`];
  return typeof value === "string" && value.trim() ? value : fallback;
}
