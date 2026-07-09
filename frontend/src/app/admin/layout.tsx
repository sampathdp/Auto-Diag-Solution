import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminProviders } from "@/components/admin/providers/AdminProviders";
import "../globals.css";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Admin — Auto Parts UAE",
  description: "Admin dashboard for Auto Parts UAE.",
  robots: { index: false, follow: false },
};

/**
 * Root layout for the whole /admin zone. It is a sibling of app/[locale],
 * not nested inside it — admin is client-rendered, English-only chrome with
 * no SEO needs, so it skips next-intl entirely (see middleware.ts, which
 * excludes /admin from locale routing).
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontSans.variable}>
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
