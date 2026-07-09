"use client";

import { useState, FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LoginSchema, LoginFormValues } from "@/schemas/LoginSchema";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<LoginFormValues | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(LoginSchema) });

  const completeLogin = (data: any) => {
    const { user, permissions } = data.data;
    setAuth(user, permissions || []);
    router.push(user.needs_password_change ? "/change-password" : "/dashboard");
  };

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/login", values);
      completeLogin(data);
    } catch (err: any) {
      if (err.response?.data?.message === "2FA_REQUIRED") {
        setPendingCredentials(values);
        setTotpCode("");
      } else {
        setError(err.response?.data?.message || t("invalidCredentials"));
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitTotp = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingCredentials) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/login", {
        ...pendingCredentials,
        totp_code: totpCode.trim(),
      });
      completeLogin(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          {pendingCredentials ? t("twoFactorTitle") : t("login")}
        </h1>

        {pendingCredentials && (
          <p className="mb-6 text-sm text-muted-foreground">{t("twoFactorSubtitle")}</p>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        {pendingCredentials ? (
          <form onSubmit={onSubmitTotp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                {t("verificationCode")}
              </label>
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoFocus
                placeholder="123456"
                className="text-center tracking-widest"
              />
            </div>
            <Button type="submit" loading={loading} className="w-full">
              {t("verify")}
            </Button>
            <button
              type="button"
              onClick={() => {
                setPendingCredentials(null);
                setError(null);
              }}
              className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {t("backToSignIn")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                {t("email")}
              </label>
              <Input type="email" error={!!errors.email} {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-xs font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                {t("password")}
              </label>
              <Input type="password" error={!!errors.password} {...register("password")} />
              {errors.password && (
                <p className="mt-1 text-xs font-medium text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" loading={loading} className="w-full">
              {t("signIn")}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
