import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Linkedin } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="bg-navy text-navy-soft text-sm">
      <div className="mx-auto grid max-w-wrap grid-cols-1 gap-11 px-6 pb-14 pt-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:px-14 md:pb-14 md:pt-20">
        <div>
          <BrandLogo variant="header" className="h-12" />
          <p className="mt-4 max-w-[34ch] leading-relaxed">{t("blurb")}</p>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-navy-foreground">
            {t("shop")}
          </h4>
          <ul className="flex flex-col gap-3">
            <li><Link href="/shop" className="hover:text-navy-foreground">{t("shopEngine")}</Link></li>
            <li><Link href="/shop" className="hover:text-navy-foreground">{t("shopBrakes")}</Link></li>
            <li><Link href="/shop" className="hover:text-navy-foreground">{t("shopFilters")}</Link></li>
            <li><Link href="/shop" className="hover:text-navy-foreground">{t("shopElectrical")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-navy-foreground">
            {t("company")}
          </h4>
          <ul className="flex flex-col gap-3">
            <li><Link href="/about" className="hover:text-navy-foreground">{nav("about")}</Link></li>
            <li><Link href="/contact" className="hover:text-navy-foreground">{nav("contact")}</Link></li>
            <li><Link href="/terms-and-conditions" className="hover:text-navy-foreground">{t("terms")}</Link></li>
            <li><Link href="/refund-policy" className="hover:text-navy-foreground">{t("refund")}</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-navy-foreground">{t("privacy")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-navy-foreground">
            {t("contact")}
          </h4>
          <ul className="flex flex-col gap-3.5">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-primary" strokeWidth={2} />
              <span>{t("address")}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 flex-none text-primary" strokeWidth={2} />
              <span className="font-mono tabular-nums">+971 4 123 4567</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 flex-none text-primary" strokeWidth={2} />
              <span>parts@asil.ae</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 flex-none text-primary" strokeWidth={2} />
              <span>{t("hours")}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-border">
        <div className="mx-auto flex max-w-wrap flex-wrap items-center justify-between gap-5 px-6 py-6 text-xs md:px-14">
          <div>{t("copyright")}</div>
          <div className="flex gap-2">
            {["VISA", "MASTERCARD", "STRIPE"].map((p) => (
              <span key={p} className="rounded border border-navy-border px-2.5 py-1 font-bold tracking-wide">
                {p}
              </span>
            ))}
          </div>
          <div className="flex gap-3.5">
            <a href="#" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-border transition-colors hover:border-primary hover:text-primary">
              <Instagram className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
            <a href="#" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-border transition-colors hover:border-primary hover:text-primary">
              <Facebook className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
            <a href="#" aria-label="LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-border transition-colors hover:border-primary hover:text-primary">
              <Linkedin className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
