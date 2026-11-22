import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronRight, BadgePercent, CalendarClock, FileText, Banknote, UserPlus, Building2, Upload, SearchCheck } from "lucide-react";
import { PartnerStatusCard } from "@/components/partner/PartnerStatusCard";

export async function generateMetadata() {
  const t = await getTranslations("partner.hero");
  return { title: t("title"), description: t("subtitle") };
}

export default async function PartnerPage() {
  const t = await getTranslations("partner");

  const benefits = [
    { key: "pricing", icon: BadgePercent },
    { key: "credit", icon: CalendarClock },
    { key: "quotation", icon: FileText },
    { key: "payments", icon: Banknote },
  ] as const;

  const steps = [
    { key: "account", icon: UserPlus },
    { key: "details", icon: Building2 },
    { key: "documents", icon: Upload },
    { key: "review", icon: SearchCheck },
  ] as const;

  return (
    <main>
      {/* Hero */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] text-navy-foreground">
        <div
          aria-hidden
          className="absolute inset-y-0 end-0 z-[1] w-[60%] max-w-[560px] opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.30), transparent 72%)" }}
        />
        <div className="relative z-[2] mx-auto flex max-w-wrap flex-col justify-end px-6 pb-10 pt-24 md:px-14 lg:pb-14 lg:pt-32">
          <div className="mb-3 flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("hero.eyebrow")}
          </div>
          <h1 className="mb-4 text-[32px] font-extrabold leading-[0.98] tracking-tight text-balance sm:text-[42px] lg:text-[52px]">
            {t("hero.title")}
          </h1>
          <p className="mb-6 max-w-[560px] text-sm leading-relaxed text-navy-soft lg:text-base">{t("hero.subtitle")}</p>
          <nav className="flex items-center gap-x-4 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft/70">
            <Link href="/" className="transition-colors hover:text-navy-foreground">Home</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-navy-foreground">{t("hero.crumb")}</span>
          </nav>
        </div>
      </div>

      {/* Status / call to action, then benefits */}
      <section className="bg-background py-14 md:py-24">
        <div className="mx-auto grid max-w-wrap gap-12 px-6 md:grid-cols-[1fr_1.15fr] md:gap-16 md:px-14">
          <div className="min-w-0">
            <PartnerStatusCard />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("benefits.eyebrow")}
            </div>
            <h2 className="mb-7 mt-4 text-[26px] font-extrabold tracking-tight text-balance sm:text-[32px]">
              {t("benefits.title")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map(({ key, icon: Icon }) => (
                <div key={key} className="rounded-xl bg-card p-5 shadow-soft">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="text-base font-extrabold text-foreground">{t(`benefits.items.${key}.title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`benefits.items.${key}.body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence, so the steps are numbered */}
      <section className="bg-secondary py-14 md:py-24">
        <div className="mx-auto max-w-wrap px-6 md:px-14">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("how.eyebrow")}
          </div>
          <h2 className="mb-10 mt-4 text-[26px] font-extrabold tracking-tight text-balance sm:text-[32px]">{t("how.title")}</h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ key, icon: Icon }, i) => (
              <li key={key} className="relative rounded-xl bg-card p-5 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="text-base font-extrabold text-foreground">{t(`how.steps.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`how.steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
