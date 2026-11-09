import { getTranslations, getLocale } from "next-intl/server";
import { getContactInfo } from "@/lib/site-info";
import { Link } from "@/i18n/navigation";
import { ChevronRight, MapPin, Phone, Mail, Clock } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const WHATSAPP_NUMBER = "971501234567";

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const tFooter = await getTranslations("footer");

  const contact = await getContactInfo(await getLocale(), {
    address: tFooter("address"),
    phone: "+971 4 123 4567",
    email: "parts@asil.ae",
    hours: tFooter("hours"),
  });

  const infoItems = [
    { icon: MapPin, label: t("info.addressLabel"), value: contact.address },
    { icon: Phone, label: t("info.phoneLabel"), value: contact.phone, mono: true },
    { icon: Mail, label: t("info.emailLabel"), value: contact.email },
    { icon: Clock, label: t("info.hoursLabel"), value: contact.hours },
  ];

  return (
    <main>
      {/* Hero */}
      <div className="relative h-[220px] w-full overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] text-navy-foreground lg:h-[280px]">
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
          <h1 className="mb-4 text-[32px] font-extrabold leading-[0.98] tracking-tight text-balance sm:text-[42px] lg:text-[52px]">
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

      {/* Form + Info */}
      <section className="bg-background py-14 md:py-28">
        <div className="mx-auto grid max-w-wrap gap-14 px-6 md:grid-cols-[1.3fr_1fr] md:gap-16 md:px-14">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("form.eyebrow")}
            </div>
            <h2 className="mt-4 mb-7 text-[26px] font-extrabold tracking-tight text-balance sm:text-[32px]">
              {t("form.title")}
            </h2>
            <ContactForm />
          </div>

          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("info.eyebrow")}
            </div>
            <h2 className="mt-4 mb-7 text-[26px] font-extrabold tracking-tight text-balance sm:text-[32px]">
              {t("info.title")}
            </h2>

            <div className="flex flex-col gap-5">
              {infoItems.map(({ icon: Icon, label, value, mono }) => (
                <div key={label} className="flex items-start gap-3.5 rounded-xl bg-card p-4 shadow-soft">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className={`mt-0.5 text-sm font-semibold text-foreground ${mono ? "font-mono tabular-nums" : ""}`}>
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-md bg-[#25D366] text-sm font-extrabold text-white shadow-lifted transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon className="h-5 w-5" />
              {t("info.whatsappCta")}
            </a>
          </div>
        </div>
      </section>

      {/* Visit Us */}
      <section className="bg-secondary py-14 md:py-28">
        <div className="mx-auto grid max-w-wrap gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-14 md:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lifted md:order-2">
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
              {t("visit.imageTag")}
            </div>
          </div>

          <div className="md:order-1">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("visit.eyebrow")}
            </div>
            <h2 className="mt-4 text-[28px] font-extrabold tracking-tight text-balance sm:text-[36px]">
              {t("visit.title")}
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-foreground/62">
              {t("visit.body")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
