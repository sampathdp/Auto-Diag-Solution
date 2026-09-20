import { getTranslations, getLocale } from "next-intl/server";
import { getHomeContent, cms } from "@/lib/home-content";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export async function AboutBand() {
  const t = await getTranslations("home.about");
  const locale = await getLocale();
  const home = await getHomeContent();
  const c = (key: string, fallback: string) => cms(home?.about, key, locale, fallback);
  const imageUrl = home?.about?.image_url || "/about-warehouse.png";

  return (
    <section className="bg-secondary py-14 md:py-28">
      <div className="mx-auto grid max-w-wrap gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-14 md:items-center">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-accessible">
            <span className="block h-0.5 w-6 bg-primary" />
            {c("eyebrow", t("eyebrow"))}
          </div>
          <h2 className="mt-4 text-[30px] font-extrabold tracking-tight text-balance sm:text-[44px]">
            {c("title", t("title"))}
          </h2>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-foreground/75">
            {c("body", t("body"))}
          </p>
          <Link
            href="/about"
            className="mt-7 inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-[13px] font-extrabold uppercase tracking-wide text-foreground"
          >
            {c("link", t("link"))}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lifted">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            loading="lazy"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-navy/20 mix-blend-multiply" />
          <div className="absolute -bottom-16 -end-16 h-72 w-72 rounded-full border-[22px] border-white/10" />
          <div className="absolute bottom-6 start-6 text-xs font-bold uppercase tracking-wider text-white/75">
            {c("image_tag", t("imageTag"))}
          </div>
        </div>
      </div>
    </section>
  );
}
