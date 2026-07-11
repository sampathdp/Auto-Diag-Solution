
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { BrandsMarquee } from "./BrandsMarquee";
import type { Brand } from "@/types/brand";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

async function getActiveBrands(): Promise<Brand[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/brands`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.items ?? []) as Brand[];
  } catch {
    return [];
  }
}

export async function BrandsStrip() {
  const t = await getTranslations("home.brands");
  const locale = await getLocale();
  const brands = await getActiveBrands();

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-14 text-center md:py-28">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        <div className="mb-11">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 px-3.5 py-1 text-[13px] font-bold text-primary uppercase tracking-widest">
            {t("eyebrow")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-[40px]">
            {t("title")}
          </h2>
        </div>

        <BrandsMarquee brands={brands} locale={locale} />

        <p className="mx-auto mt-14 max-w-2xl text-[15px] leading-relaxed text-foreground/60">
          {t.rich("description", {
            br: () => <br className="hidden sm:block" />,
          })}
        </p>

        <div className="mt-8">
          <Link 
            href="/brands" 
            className="inline-flex items-center gap-1.5 text-[15px] font-bold text-primary transition-colors hover:text-primary/80"
          >
            {t("link")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={2.5} />
          </Link>
        </div>

      </div>
    </section>
  );
}
