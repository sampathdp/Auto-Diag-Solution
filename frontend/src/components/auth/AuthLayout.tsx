"use client";

import { Link } from "@/i18n/navigation";
import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("auth");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] px-14 py-16 text-navy-foreground lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/auth-bg.png"
          alt="Auth background"
          fill
          className="absolute inset-0 z-0 object-cover opacity-30 mix-blend-overlay"
          priority
        />
        <div
          aria-hidden
          className="absolute inset-y-0 end-0 z-[1] w-[70%] max-w-[560px] opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.30), transparent 72%)" }}
        />

        <Link href="/" className="relative z-[2] flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <Settings2 className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
          </span>
          FERRUM
        </Link>

        <div className="relative z-[2] max-w-md">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("panelEyebrow")}
          </div>
          <h2 className="mt-5 text-[40px] font-extrabold leading-[1.02] tracking-tight text-balance">
            {t("panelTagline")}
          </h2>
          <div className="mt-7 flex flex-col gap-2 text-[13px] font-semibold text-navy-soft">
            <div className="flex items-center gap-2.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {t("panelCredential1")}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {t("panelCredential2")}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {t("panelCredential3")}
            </div>
          </div>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-16 md:px-14">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex items-center gap-2.5 text-[18px] font-extrabold tracking-tight text-foreground lg:hidden"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground">
              <Settings2 className="h-3.5 w-3.5 text-background" strokeWidth={2} />
            </span>
            FERRUM
          </Link>

          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("eyebrow")}
          </div>
          <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-balance text-foreground sm:text-[32px]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
