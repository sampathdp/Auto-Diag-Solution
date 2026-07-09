"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { ResetPasswordSchema, ResetPasswordFormValues } from "@/schemas/ResetPasswordSchema";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthLayout } from "@/components/auth/AuthLayout";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(ResetPasswordSchema) });

  if (!token) {
    return (
      <AuthLayout title={t("resetPasswordTitle")} subtitle={t("resetLinkInvalid")}>
        <Link href="/forgot-password" className="font-bold text-primary hover:underline">
          {t("requestNewLink")}
        </Link>
      </AuthLayout>
    );
  }

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        new_password: values.password,
      });
      toast.success(t("resetSuccess"));
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || t("resetLinkInvalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("resetPasswordTitle")} subtitle={t("resetPasswordSubtitle")}>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("newPassword")}</label>
          <Input type="password" error={!!errors.password} {...register("password")} />
          {errors.password && <p className="mt-1 text-xs font-medium text-destructive">{errors.password.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("confirmPassword")}</label>
          <Input type="password" error={!!errors.confirmPassword} {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" loading={loading} className="w-full">
          {t("resetPasswordButton")}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
