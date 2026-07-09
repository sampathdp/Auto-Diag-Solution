"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordSchema, ForgotPasswordFormValues } from "@/schemas/ForgotPasswordSchema";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { MailCheck, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(ForgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/forgot-password", values);
      setDevResetUrl(data.data?.reset_url ?? null);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? t("checkEmailTitle") : t("forgotPasswordTitle")}
      subtitle={sent ? t("checkEmailSubtitle") : t("forgotPasswordSubtitle")}
    >
      {sent ? (
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="h-6 w-6" />
          </span>

          {devResetUrl && (
            <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-4 text-start">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-warning">{t("devModeNotice")}</p>
              <a href={devResetUrl} className="break-all text-sm font-medium text-primary hover:underline">
                {devResetUrl}
              </a>
            </div>
          )}

          <Link href="/login" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {t("backToSignIn")}
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("email")}</label>
              <Input type="email" error={!!errors.email} {...register("email")} />
              {errors.email && <p className="mt-1 text-xs font-medium text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" loading={loading} className="w-full">
              {t("sendResetLink")}
            </Button>
          </form>
          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-bold text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {t("backToSignIn")}
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
