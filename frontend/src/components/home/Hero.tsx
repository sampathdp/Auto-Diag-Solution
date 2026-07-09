import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { VehicleFinder } from "@/components/home/VehicleFinder";

export async function Hero() {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] pb-36 pt-24 text-navy-foreground">
      {/* technical grid texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(1200px 700px at 70% 20%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(1200px 700px at 70% 20%, black, transparent 75%)",
        }}
      />
      {/* precision rotor motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute end-[-180px] top-1/2 h-[820px] w-[820px] -translate-y-1/2 rounded-full opacity-70 motion-safe:animate-[spin_120s_linear_infinite]"
        style={{
          backgroundImage:
            "repeating-conic-gradient(from 0deg, hsl(0 0% 100% / 0.06) 0deg 6deg, transparent 6deg 18deg)",
          maskImage: "radial-gradient(circle, black 58%, transparent 60%)",
          WebkitMaskImage: "radial-gradient(circle, black 58%, transparent 60%)",
        }}
      >
        <div className="absolute inset-[16%] rounded-full border border-white/10" />
        <div className="absolute inset-[36%] rounded-full border border-white/15" />
      </div>

      <div className="relative z-[2] mx-auto max-w-wrap px-6 md:px-14">
        <div className="max-w-[840px]">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("eyebrow")}
          </div>
          <h1 className="mt-5 text-[40px] font-extrabold leading-[0.98] tracking-tight text-balance sm:text-[56px] lg:text-[88px]">
            {t("titleLine1")}
            <br />
            {t("titleLine2")} <span className="text-primary">{t("titleHighlight")}</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-navy-soft">
            {t("subtitle")}
          </p>
          <div className="mt-11 flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/shop">{t("ctaShop")}</Link>
            </Button>
            <Button asChild variant="outlineLight" size="lg">
              <a href="#finder">{t("ctaFinder")}</a>
            </Button>
          </div>
        </div>

        <VehicleFinder />
      </div>
    </section>
  );
}
