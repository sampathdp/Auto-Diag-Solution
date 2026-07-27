import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, isRtl } from "@/i18n/routing";
import { AppProviders } from "@/app/providers";
import { SplashPreloader } from "@/components/ui/SplashPreloader";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../globals.css";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "ASIL Auto Parts Hub",
  description: "Genuine auto parts, delivered across the UAE.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${fontSans.variable} ${fontArabic.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <SplashPreloader />
          <div className="flex min-h-screen flex-col overflow-x-hidden">
            <AppProviders>{children}</AppProviders>
          </div>
        </NextIntlClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
