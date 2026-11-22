"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2, Clock, AlertTriangle, XCircle, PauseCircle, FileEdit, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import type { MyDealerApplication, PartnerInfo } from "@/types/dealer";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "border-border bg-card",
  info: "border-primary/30 bg-primary/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  danger: "border-destructive/30 bg-destructive/5",
};

const ICON_TONE: Record<Tone, string> = {
  neutral: "text-primary",
  info: "text-primary",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-destructive",
};

export function PartnerStatusCard() {
  const t = useTranslations("partner");
  const locale = useLocale();
  const { isAuthenticated, user } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === "customer";

  const info = useQuery({
    queryKey: ["partner", "info"],
    queryFn: async () => (await apiClient.get("/partner/info")).data.data as PartnerInfo,
    staleTime: 5 * 60_000,
  });

  const mine = useQuery({
    queryKey: ["partner", "mine"],
    queryFn: async () => (await apiClient.get("/account/dealer")).data.data as MyDealerApplication | null,
    enabled: isCustomer,
  });

  const loading = info.isLoading || (isCustomer && mine.isLoading);
  const app = mine.data ?? null;
  const open = info.data?.registration_enabled ?? true;
  const formatDate = (iso: string) => new Date(iso.replace(" ", "T")).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  let tone: Tone = "neutral";
  let Icon = FileEdit;
  let title = t("status.none.title");
  let body: string | null = t("status.none.body");
  let extra: string | null = null;
  let quote: string | null = null;
  let cta: { href: string; label: string } | null = null;
  let secondary: { href: string; label: string } | null = null;

  if (!isAuthenticated) {
    cta = open ? { href: "/login?next=/partner/apply", label: t("cta.signIn") } : null;
    secondary = open ? { href: "/register?next=/partner/apply", label: t("cta.register") } : null;
  } else if (!isCustomer) {
    body = t("cta.adminNote");
  } else if (!app) {
    cta = open ? { href: "/partner/apply", label: t("cta.apply") } : null;
  } else {
    const code = app.dealer?.dealer_code ?? "";
    switch (app.status) {
      case "draft":
        if (app.info_request_message) {
          tone = "warning";
          Icon = AlertTriangle;
          title = t("status.infoRequested.title");
          body = t("status.infoRequested.body");
          quote = app.info_request_message;
          cta = { href: "/partner/apply", label: t("cta.update") };
        } else {
          title = t("status.draft.title");
          body = t("status.draft.body");
          cta = { href: "/partner/apply", label: t("cta.continue") };
        }
        break;
      case "pending_review":
      case "under_review":
        tone = "info";
        Icon = Clock;
        title = t(`status.${app.status}.title`);
        body = t(`status.${app.status}.body`);
        extra = app.submitted_at ? t("status.submittedOn", { date: formatDate(app.submitted_at) }) : null;
        break;
      case "approved":
        if (app.dealer?.expired) {
          tone = "warning";
          Icon = AlertTriangle;
          title = t("status.approvedExpired.title");
          body = t("status.approvedExpired.body", { code });
        } else if (app.dealer?.not_yet_active) {
          tone = "info";
          Icon = Clock;
          title = t("status.approvedNotYet.title");
          body = t("status.approvedNotYet.body", { code });
        } else {
          tone = "success";
          Icon = CheckCircle2;
          title = t("status.approved.title");
          body = t("status.approved.body", { code });
          cta = { href: "/shop", label: t("cta.shop") };
        }
        extra = app.credit?.credit_enabled
          ? t("status.credit", {
              limit: Number(app.credit.credit_limit).toLocaleString(locale === "ar" ? "ar-AE" : "en-AE"),
              days: app.credit.credit_period_days,
            })
          : t("status.noCredit");
        break;
      case "rejected":
        tone = "danger";
        Icon = XCircle;
        title = t("status.rejected.title");
        body = t("status.rejected.body", { reason: app.rejection_reason ?? "" });
        extra = app.allow_resubmission ? t("status.rejectedCanRetry") : t("status.rejectedFinal");
        cta = app.allow_resubmission ? { href: "/partner/apply", label: t("cta.update") } : null;
        break;
      case "suspended":
        tone = "warning";
        Icon = PauseCircle;
        title = t("status.suspended.title");
        body = t("status.suspended.body", { reason: app.suspension_reason ?? "" });
        break;
    }
  }

  const closedForNewApplicants = !open && (!app || app.status === "draft");

  return (
    <div>
      <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
        <span className="block h-0.5 w-6 bg-primary" />
        {t("status.eyebrow")}
      </div>

      <div className={cn("mt-5 rounded-xl border p-6 shadow-soft md:p-7", TONE[tone])} aria-live="polite">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            …
          </div>
        ) : (
          <>
            <Icon className={cn("mb-4 h-8 w-8", ICON_TONE[tone])} strokeWidth={1.75} />
            <h2 className="text-[22px] font-extrabold tracking-tight text-foreground text-balance">{title}</h2>
            {body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>}
            {quote && (
              <blockquote className="mt-4 whitespace-pre-line rounded-md border-s-4 border-amber-500 bg-card px-4 py-3 text-sm text-foreground">
                {quote}
              </blockquote>
            )}
            {extra && <p className="mt-3 text-sm font-semibold text-foreground">{extra}</p>}

            {closedForNewApplicants ? (
              <p className="mt-5 text-sm font-semibold text-foreground">{t("cta.closed")}</p>
            ) : (
              (cta || secondary) && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {cta && (
                    <Link href={cta.href as any} className={buttonVariants({ variant: "primary" })}>
                      {cta.label}
                    </Link>
                  )}
                  {secondary && (
                    <Link href={secondary.href as any} className={buttonVariants({ variant: "secondary" })}>
                      {secondary.label}
                    </Link>
                  )}
                </div>
              )
            )}
          </>
        )}
      </div>

      {info.data?.terms_html ? (
        <details className="mt-6 rounded-xl bg-card p-5 shadow-soft">
          <summary className="cursor-pointer text-sm font-extrabold text-foreground">{t("terms.title")}</summary>
          {/* Shown as plain text: the setting is admin-edited, never injected as HTML. */}
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{info.data.terms_html}</p>
        </details>
      ) : null}
    </div>
  );
}
