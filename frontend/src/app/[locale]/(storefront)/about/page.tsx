import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronRight, ShieldCheck, Target, PackageCheck, MessageCircle } from "lucide-react";
import { StatsStrip } from "@/components/home/StatsStrip";
import { Testimonial } from "@/components/home/Testimonial";
import { CtaBand } from "@/components/home/CtaBand";

export default async function AboutPage() {
  const t = await getTranslations("about");

  const values = [
    { icon: ShieldCheck, title: t("values.item1Title"), body: t("values.item1Body") },
    { icon: Target, title: t("values.item2Title"), body: t("values.item2Body") },
    { icon: PackageCheck, title: t("values.item3Title"), body: t("values.item3Body") },
    { icon: MessageCircle, title: t("values.item4Title"), body: t("values.item4Body") },
  ];

  const milestones = [
    { year: t("timeline.y1_year"), title: t("timeline.y1_title"), body: t("timeline.y1_body") },
    { year: t("timeline.y2_year"), title: t("timeline.y2_title"), body: t("timeline.y2_body") },
    { year: t("timeline.y3_year"), title: t("timeline.y3_title"), body: t("timeline.y3_body") },
    { year: t("timeline.y4_year"), title: t("timeline.y4_title"), body: t("timeline.y4_body") },
  ];

  return (
    <main>
      {/* Hero */}
      <div className="relative h-[240px] w-full overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] text-navy-foreground lg:h-[320px]">
        <div
          aria-hidden
          className="absolute inset-y-0 end-0 z-[1] w-[60%] max-w-[560px] opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.30), transparent 72%)" }}
        />
        <div className="relative z-[2] mx-auto flex h-full max-w-wrap flex-col justify-end px-6 pb-8 md:px-14 lg:pb-12">
          <div className="mb-3 flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("hero.eyebrow")}
          </div>
          <h1 className="mb-4 text-[36px] font-extrabold leading-[0.98] tracking-tight text-balance sm:text-[48px] lg:text-[64px]">
            {t("hero.title")}
          </h1>
          <p className="mb-6 max-w-[520px] text-sm leading-relaxed text-navy-soft lg:text-base">
            {t("hero.subtitle")}
          </p>
          <nav className="flex items-center gap-x-4 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft/70">
            <Link href="/" className="hover:text-navy-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-navy-foreground">{t("hero.crumb")}</span>
          </nav>
        </div>
      </div>

      {/* Our Story */}
      <section className="bg-secondary py-14 md:py-28">
        <div className="mx-auto grid max-w-wrap gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-14 md:items-center">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("story.eyebrow")}
            </div>
            <h2 className="mt-4 text-[28px] font-extrabold tracking-tight text-balance sm:text-[36px]">
              {t("story.title")}
            </h2>
            <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-foreground/62">
              {t("story.body1")}
            </p>
            <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-foreground/62">
              {t("story.body2")}
            </p>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lifted">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/about-warehouse.png')" }}
            />
            <div className="absolute inset-0 bg-navy/20 mix-blend-multiply" />
            <span
              aria-hidden
              className="absolute start-4 top-4 h-4 w-4 border-s-2 border-t-2 border-white/25"
            />
            <div className="absolute -bottom-16 -end-16 h-72 w-72 rounded-full border-[22px] border-white/10" />
            <div className="absolute bottom-6 start-6 text-xs font-bold uppercase tracking-wider text-white/75">
              {t("story.imageTag")}
            </div>
          </div>
        </div>
      </section>

      <StatsStrip />

      {/* Our Values */}
      <section className="bg-background py-14 md:py-28">
        <div className="mx-auto max-w-wrap px-6 md:px-14">
          <div className="mb-11">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("values.eyebrow")}
            </div>
            <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {t("values.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-card p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="text-[17px] font-extrabold">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground/62">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="bg-secondary py-14 md:py-28">
        <div className="mx-auto max-w-wrap px-6 md:px-14">
          <div className="mb-11">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("timeline.eyebrow")}
            </div>
            <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {t("timeline.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {milestones.map((m, i) => (
              <div key={m.year} className="relative rounded-xl bg-card p-6 shadow-soft">
                <span
                  aria-hidden
                  className="absolute start-4 top-4 h-4 w-4 border-s-2 border-t-2 border-foreground/10"
                />
                <div className="text-[13px] font-extrabold uppercase tracking-wider text-primary">{m.year}</div>
                <h3 className="mt-2 text-[17px] font-extrabold">{m.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground/62">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Testimonial />
      <CtaBand />
    </main>
  );
}
