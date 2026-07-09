import { getTranslations } from "next-intl/server";

export async function StatsStrip() {
  const t = await getTranslations("home.stats");

  const stats = [
    { value: "10,000+", label: t("parts"), accent: true },
    { value: "500+", label: t("models"), accent: false },
    { value: t("dispatchValue"), label: t("dispatch"), accent: false },
    { value: t("genuineValue"), label: t("genuine"), accent: false },
  ];

  return (
    <section className="bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-wrap grid-cols-2 gap-y-9 gap-x-6 px-6 py-14 md:grid-cols-4 md:gap-0 md:px-14">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={i > 0 ? "md:border-s md:border-navy-border md:ps-10" : ""}
          >
            <div className={`text-[30px] font-black tracking-tight sm:text-[40px] ${s.accent ? "text-primary" : ""}`}>
              {s.value}
            </div>
            <div className="mt-2 text-[13px] text-navy-soft">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
