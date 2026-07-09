"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";

export function AnnouncementBar() {
  const t = useTranslations("announce");
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

  return (
    <div className="bg-navy text-navy-foreground text-[13px]">
      <div className="mx-auto flex h-9 max-w-wrap items-center justify-between px-6 md:px-14">
        <p className="text-navy-soft">
          {t.rich("message", {
            strong: (chunks) => <strong className="font-mono font-bold text-navy-foreground">{chunks}</strong>,
          })}
        </p>
        <div className="flex items-center gap-2 font-bold">
          <Link
            href={pathname}
            locale="en"
            className={currentLocale === "en" ? "text-primary" : "text-navy-soft hover:text-navy-foreground"}
          >
            EN
          </Link>
          <span className="text-navy-border">|</span>
          <Link
            href={pathname}
            locale="ar"
            className={currentLocale === "ar" ? "text-primary" : "text-navy-soft hover:text-navy-foreground"}
          >
            عربي
          </Link>
        </div>
      </div>
    </div>
  );
}
