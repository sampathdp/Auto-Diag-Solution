import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: Locale[] = ["ar"];

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}
