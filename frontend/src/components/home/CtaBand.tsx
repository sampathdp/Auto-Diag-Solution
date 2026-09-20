import { getTranslations, getLocale } from "next-intl/server";
import { getHomeContent, cms } from "@/lib/home-content";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export async function CtaBand() {
  const t = await getTranslations("home.cta");
  const locale = await getLocale();
  const home = await getHomeContent();
  const whatsapp = (home?.cta?.whatsapp_number || "971501234567").replace(/\D/g, "");

  return (
    <section className="bg-primary-accessible text-primary-foreground">
      <div className="mx-auto flex max-w-wrap flex-wrap items-center justify-between gap-7 px-6 py-14 md:px-14">
        <h2 className="max-w-[560px] text-2xl font-extrabold text-balance sm:text-4xl">
          {cms(home?.cta, "title", locale, t("title"))}
        </h2>
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[60px] flex-none items-center gap-3 rounded-md bg-foreground px-7 text-[15px] font-extrabold text-background shadow-lifted transition-transform hover:-translate-y-0.5"
        >
          <WhatsAppIcon className="h-[22px] w-[22px]" />
          {cms(home?.cta, "button", locale, t("button"))}
        </a>
      </div>
    </section>
  );
}
