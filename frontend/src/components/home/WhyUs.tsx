import { getTranslations } from "next-intl/server";
import { ShieldCheck, Truck, MessageCircle, RotateCcw } from "lucide-react";

export async function WhyUs() {
  const t = await getTranslations("home.why");

  const items = [
    { icon: ShieldCheck, title: t("genuineTitle"), body: t("genuineBody") },
    { icon: Truck, title: t("deliveryTitle"), body: t("deliveryBody") },
    { icon: MessageCircle, title: t("supportTitle"), body: t("supportBody") },
    { icon: RotateCcw, title: t("returnsTitle"), body: t("returnsBody") },
  ];

  return (
    <section className="bg-background py-14 md:py-28">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        <div className="mb-11">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-accessible">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("eyebrow")}
          </div>
          <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body }) => (
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
  );
}
