import { getTranslations, getLocale } from "next-intl/server";
import { getHomeContent, cms } from "@/lib/home-content";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { AboutImageCarousel } from "@/components/home/AboutImageCarousel";

export async function AboutBand() {
  const t = await getTranslations("home.about");
  const locale = await getLocale();
  const home = await getHomeContent();
  const c = (key: string, fallback: string) => cms(home?.about, key, locale, fallback);
  const uploaded = (home?.about?.images ?? []).filter(Boolean).slice(0, 5);
  const defaultImages = [
    "/about-warehouse.png",
    "/about-warehouse-2.jpg",
    "/about-warehouse-3.jpg",
  ];

  let images: string[] = [];
  if (uploaded.length >= 2) {
    images = uploaded;
  } else if (uploaded.length === 1) {
    images = [uploaded[0], ...defaultImages.filter((img) => img !== uploaded[0])];
  } else if (home?.about?.image_url) {
    images = [home.about.image_url, ...defaultImages.filter((img) => img !== home.about.image_url)];
  } else {
    images = defaultImages;
  }
  const usingDefaults = images === defaultImages;

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

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lifted group">
          <AboutImageCarousel
            images={images}
            imageTag={c("image_tag", t("imageTag"))}
            imageTags={usingDefaults ? (t.raw("imageTags") as string[]) : undefined}
          />
        </div>
      </div>
    </section>
  );
}
