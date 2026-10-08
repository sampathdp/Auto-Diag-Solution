import { getTranslations, getLocale } from "next-intl/server";
import { getHomeContent, cms } from "@/lib/home-content";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { VehicleFinder } from "@/components/home/VehicleFinder";
import { HeroCarouselBg } from "@/components/home/HeroCarouselBg";

export async function Hero() {
  const t = await getTranslations("home.hero");
  const locale = await getLocale();
  const home = await getHomeContent();
  const c = (key: string, fallback: string) => cms(home?.hero, key, locale, fallback);

  const heroUploaded = (home?.hero?.images ?? []).filter(Boolean);

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] pb-36 pt-24 text-navy-foreground">
      <HeroCarouselBg customImages={heroUploaded.length > 0 ? heroUploaded : undefined} />
      <div
        aria-hidden
        className="absolute inset-y-0 end-0 z-[1] w-[60%] max-w-[720px] opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.30), transparent 72%)" }}
      />

      <div className="relative z-[2] mx-auto max-w-wrap px-6 md:px-14">
        <div className="max-w-[840px]">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {c("eyebrow", t("eyebrow"))}
          </div>
          <h1 className="mt-5 text-[40px] font-extrabold leading-[0.98] tracking-tight text-balance sm:text-[56px] lg:text-[88px]">
            {c("title_line1", t("titleLine1"))}
            <br />
            {c("title_line2", t("titleLine2"))} <span className="text-primary">{c("title_highlight", t("titleHighlight"))}</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-navy-soft">
            {c("subtitle", t("subtitle"))}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft/70">
            <span>{c("credential1", t("credential1"))}</span>
            <span className="h-1 w-1 rounded-full bg-navy-soft/40" />
            <span>{c("credential2", t("credential2"))}</span>
            <span className="h-1 w-1 rounded-full bg-navy-soft/40" />
            <span>{c("credential3", t("credential3"))}</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/shop">{c("cta_shop", t("ctaShop"))}</Link>
            </Button>
            <Button asChild variant="outlineLight" size="lg">
              <a href="#finder">{c("cta_finder", t("ctaFinder"))}</a>
            </Button>
          </div>
        </div>

        <VehicleFinder />
      </div>
    </section>
  );
}
