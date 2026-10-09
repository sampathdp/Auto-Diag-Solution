"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, ShieldCheck, Target, PackageCheck, MessageCircle, Loader2, type LucideIcon } from "lucide-react";
import { useAboutPage } from "@/hooks/useAboutPage";
import { AboutImageCarousel } from "@/components/home/AboutImageCarousel";
import type { AboutValueItem } from "@/types/aboutPage";

const VALUE_ICONS: Record<AboutValueItem["icon"], LucideIcon> = {
  ShieldCheck,
  Target,
  PackageCheck,
  MessageCircle,
};

interface AboutPageViewProps {
  // StatsStrip/Testimonial/CtaBand are async Server Components (they call
  // next-intl/server) — they can't be imported directly into this Client
  // Component, only received as already-rendered children from the Server
  // Component page.tsx that renders <AboutPageView>. See React/Next.js
  // server-in-client composition pattern.
  statsStrip: ReactNode;
  testimonial: ReactNode;
  ctaBand: ReactNode;
}

export function AboutPageView({ statsStrip, testimonial, ctaBand }: AboutPageViewProps) {
  const locale = useLocale();
  const t = useTranslations("about.story");
  const isAr = locale === "ar";
  const { data: page, isLoading, isError } = useAboutPage();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="mx-auto flex max-w-wrap flex-col items-center justify-center px-6 py-32 text-center md:px-14">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Content unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Couldn&apos;t load this page right now — please try again shortly.</p>
      </div>
    );
  }

  const pick = (en: string, ar: string) => (isAr ? ar : en);

  const values = page.values.items.map((item) => ({
    icon: VALUE_ICONS[item.icon] ?? ShieldCheck,
    title: pick(item.title_en, item.title_ar),
    body: pick(item.body_en, item.body_ar),
  }));

  const milestones = page.timeline.items.map((item) => ({
    year: pick(item.year_en, item.year_ar),
    title: pick(item.title_en, item.title_ar),
    body: pick(item.body_en, item.body_ar),
  }));

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
            {pick(page.hero.eyebrow_en, page.hero.eyebrow_ar)}
          </div>
          <h1 className="mb-4 text-[36px] font-extrabold leading-[0.98] tracking-tight text-balance sm:text-[48px] lg:text-[64px]">
            {pick(page.hero.title_en, page.hero.title_ar)}
          </h1>
          <p className="mb-6 max-w-[520px] text-sm leading-relaxed text-navy-soft lg:text-base">
            {pick(page.hero.subtitle_en, page.hero.subtitle_ar)}
          </p>
          <nav className="flex items-center gap-x-4 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft/70">
            <Link href="/" className="hover:text-navy-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-navy-foreground">{pick(page.hero.crumb_en, page.hero.crumb_ar)}</span>
          </nav>
        </div>
      </div>

      {/* Our Story */}
      <section className="bg-secondary py-14 md:py-28">
        <div className="mx-auto grid max-w-wrap gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-14 md:items-center">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {pick(page.story.eyebrow_en, page.story.eyebrow_ar)}
            </div>
            <h2 className="mt-4 text-[28px] font-extrabold tracking-tight text-balance sm:text-[36px]">
              {pick(page.story.title_en, page.story.title_ar)}
            </h2>
            <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-foreground/62">
              {pick(page.story.body1_en, page.story.body1_ar)}
            </p>
            <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-foreground/62">
              {pick(page.story.body2_en, page.story.body2_ar)}
            </p>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lifted group">
            <AboutImageCarousel
              images={[
                page.story.image_url || "/about-warehouse.png",
                "/about-warehouse-2.jpg",
                "/about-warehouse-3.jpg",
              ]}
              imageTag={pick(page.story.image_tag_en, page.story.image_tag_ar)}
              imageTags={t.raw("imageTags") as string[]}
            />
          </div>
        </div>
      </section>

      {statsStrip}

      {/* Our Values */}
      <section className="bg-background py-14 md:py-28">
        <div className="mx-auto max-w-wrap px-6 md:px-14">
          <div className="mb-11">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {pick(page.values.eyebrow_en, page.values.eyebrow_ar)}
            </div>
            <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {pick(page.values.title_en, page.values.title_ar)}
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
              {pick(page.timeline.eyebrow_en, page.timeline.eyebrow_ar)}
            </div>
            <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {pick(page.timeline.title_en, page.timeline.title_ar)}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {milestones.map((m, i) => (
              <div key={`${m.year}-${i}`} className="relative rounded-xl bg-card p-6 shadow-soft">
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

      {testimonial}
      {ctaBand}
    </main>
  );
}
