"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { RegisterSchema, RegisterFormValues } from "@/schemas/RegisterSchema";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SocialButtons } from "@/components/auth/SocialButtons";

export default function RegisterPageClient() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(RegisterSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/auth/register", {
        name: values.name,
        email: values.email,
        password: values.password,
      });

      // register() doesn't issue auth cookies itself — sign the new account in
      // immediately so the user lands straight in their account, not back at login.
      const { data } = await apiClient.post("/auth/login", {
        email: values.email,
        password: values.password,
      });
      const { user, permissions } = data.data;
      setAuth(user, permissions || []);
      router.push("/account/overview");
    } catch (err: any) {
      setError(err.response?.data?.message || t("registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("createAccount")} subtitle={t("registerSubtitle")}>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("name")}</label>
          <Input error={!!errors.name} {...register("name")} />
          {errors.name && <p className="mt-1 text-xs font-medium text-destructive">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("email")}</label>
          <Input type="email" error={!!errors.email} {...register("email")} />
          {errors.email && <p className="mt-1 text-xs font-medium text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("password")}</label>
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
          {t("createAccount")}
        </Button>
      </form>

      <SocialButtons />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          {t("login")}
        </Link>
      </p>
    </AuthLayout>
  );
}
