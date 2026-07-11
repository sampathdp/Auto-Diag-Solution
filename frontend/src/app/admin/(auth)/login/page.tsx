"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, BarChart3, Package } from "lucide-react";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { Checkbox } from "@/components/admin/ui/Checkbox";
import { FormField } from "@/components/admin/ui/FormField";
import { showSuccess } from "@/components/admin/ui/toast";
import { useAuthStore } from "@/store/useAuthStore";
import { BrandLogo } from "@/components/ui/BrandLogo";
import apiClient from "@/lib/api/client";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  remember: z.boolean().optional(),
});
type LoginFormValues = z.infer<typeof LoginSchema>;

const HIGHLIGHTS = [
  { icon: Package, text: "Manage products, categories, and vehicle fitment in one place" },
  { icon: BarChart3, text: "Track revenue, orders, and stock levels in real time" },
  { icon: ShieldCheck, text: "Role-aware access, backed by real JWT auth" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<LoginFormValues | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const completeLogin = (data: { user: { role: string; [key: string]: unknown }; permissions?: string[] }) => {
    if (data.user.role !== "admin") {
      setFormError("This account does not have admin access.");
      return;
    }
    setAuth(data.user as any, data.permissions ?? []);
    showSuccess("Welcome back");
    router.replace("/admin/dashboard");
  };

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setFormError(null);
    try {
      const { data } = await apiClient.post("/auth/login", values);
      completeLogin(data.data);
    } catch (err: any) {
      if (err.response?.data?.message === "2FA_REQUIRED") {
        setPendingCredentials(values);
        setTotpCode("");
      } else {
        setFormError(err.response?.data?.message || "Unable to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitTotp = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingCredentials) return;

    setLoading(true);
    setFormError(null);
    try {
      const { data } = await apiClient.post("/auth/login", {
        ...pendingCredentials,
        totp_code: totpCode.trim(),
      });
      completeLogin(data.data);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="icon" className="h-10" />
          <span className="text-label font-bold uppercase tracking-wide">ASIL</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-h1 font-bold leading-tight">Run the whole storefront from one dashboard.</h1>
          <p className="mt-4 text-body text-sidebar-foreground/70">
            Products, orders, customers, content, and reports — everything the UAE auto parts team needs,
            built on the same design system as the storefront.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-white/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-body text-sidebar-foreground/80">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-caption text-sidebar-foreground/50">© {new Date().getFullYear()} ASIL Auto Parts Hub</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-1 items-center justify-center bg-app px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <BrandLogo variant="icon" className="h-9" />
              <span className="text-label font-bold uppercase tracking-wide text-ink">ASIL</span>
            </div>
          </div>

          <h2 className="text-h2 font-bold text-ink">{pendingCredentials ? "Two-factor verification" : "Sign in"}</h2>
          <p className="mt-1 text-body text-ink-muted">
            {pendingCredentials
              ? "Enter the 6-digit code from your authenticator app."
              : "Sign in with your admin account credentials."}
          </p>

          {formError && (
            <div className="mt-5 rounded-sm border border-danger/20 bg-danger/10 px-3.5 py-3 text-body font-medium text-danger">
              {formError}
            </div>
          )}

          {pendingCredentials ? (
            <form onSubmit={onSubmitTotp} className="mt-6 space-y-4">
              <FormField label="Verification code" htmlFor="totp_code">
                <Input
                  id="totp_code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  autoFocus
                  placeholder="123456"
                  className="text-center tracking-widest"
                />
              </FormField>
              <Button type="submit" loading={loading} className="w-full">
                Verify
              </Button>
              <button
                type="button"
                onClick={() => {
                  setPendingCredentials(null);
                  setFormError(null);
                }}
                className="w-full text-center text-caption font-semibold text-ink-muted hover:text-ink"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" error={!!errors.email} {...register("email")} />
              </FormField>

              <FormField label="Password" htmlFor="password" error={errors.password?.message}>
                <Input id="password" type="password" error={!!errors.password} {...register("password")} />
              </FormField>

              <div className="flex items-center justify-between">
                <Checkbox id="remember" label="Remember me" {...register("remember")} />
                <Link href="/admin/forgot-password" className="text-caption font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
