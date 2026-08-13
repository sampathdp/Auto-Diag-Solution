import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo/product";

/**
 * hreflang alternates for a locale-prefixed path (e.g. "/shop" or
 * "/shop/product/42") — every locale points at every other locale's version of the
 * same page, plus an x-default pointing at the site's default locale, so search
 * engines can associate the en/ar versions with each other instead of treating them
 * as unrelated duplicate content.
 */
export function localeAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${SITE_URL}/${locale}${path}`;
  }
  languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}${path}`;
  return languages;
}
