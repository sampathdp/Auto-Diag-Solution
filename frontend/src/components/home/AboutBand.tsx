import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

export async function AboutBand() {
  const t = await getTranslations("home.about");

  return (
    <section className="bg-secondary py-14 md:py-28">
      <div className="mx-auto grid max-w-wrap gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-14 md:items-center">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("eyebrow")}
          </div>
          <h2 className="mt-4 text-[30px] font-extrabold tracking-tight text-balance sm:text-[44px]">
            {t("title")}
          </h2>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-foreground/62">
            {t("body")}
          </p>
          <Link
            href="/about"
            className="mt-7 inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-[13px] font-extrabold uppercase tracking-wide text-foreground"
          >
            {t("link")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lifted">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/about-warehouse.png')" }}
          />
          <div className="absolute inset-0 bg-navy/20 mix-blend-multiply" />
          <div className="absolute -bottom-16 -end-16 h-72 w-72 rounded-full border-[22px] border-white/10" />
          <div className="absolute bottom-6 start-6 text-xs font-bold uppercase tracking-wider text-white/75">
            {t("imageTag")}
          </div>
        </div>
      </div>
    </section>
  );
}
