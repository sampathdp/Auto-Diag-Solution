import { getTranslations } from "next-intl/server";

export async function Testimonial() {
  const t = await getTranslations("home.testimonial");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#101823] via-navy to-[#141a24] py-14 md:py-28">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(900px 500px at 15% 30%, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(900px 500px at 15% 30%, black, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[900px] px-6 md:px-14">
        <div className="font-serif text-[64px] leading-none text-primary sm:text-[88px]">&ldquo;</div>
        <blockquote className="text-[22px] font-bold leading-snug tracking-tight text-balance text-navy-foreground sm:text-[34px]">
          {t("quote")}
        </blockquote>
        <div className="mt-8 flex items-center gap-3.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <div>
            <div className="text-sm font-extrabold text-navy-foreground">{t("name")}</div>
            <div className="text-[13px] text-navy-soft">{t("role")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
