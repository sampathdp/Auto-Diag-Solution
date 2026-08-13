import { getTranslations } from "next-intl/server";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export async function CtaBand() {
  const t = await getTranslations("home.cta");

  return (
    <section className="bg-primary-accessible text-primary-foreground">
      <div className="mx-auto flex max-w-wrap flex-wrap items-center justify-between gap-7 px-6 py-14 md:px-14">
        <h2 className="max-w-[560px] text-2xl font-extrabold text-balance sm:text-4xl">
          {t("title")}
        </h2>
        <a
          href="https://wa.me/971501234567"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[60px] flex-none items-center gap-3 rounded-md bg-foreground px-7 text-[15px] font-extrabold text-background shadow-lifted transition-transform hover:-translate-y-0.5"
        >
          <WhatsAppIcon className="h-[22px] w-[22px]" />
          {t("button")}
        </a>
      </div>
    </section>
  );
}
