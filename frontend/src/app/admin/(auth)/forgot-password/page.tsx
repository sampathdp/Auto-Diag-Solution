"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { FormField } from "@/components/admin/ui/FormField";
import { Card, CardBody } from "@/components/admin/ui/Card";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { onFormInvalid } from "@/lib/admin/formErrors";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});
type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export default function AdminForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(ForgotPasswordSchema) });

  // No reset-password endpoint exists yet (out of scope for this phase) — this
  // just simulates the round trip so the flow can be reviewed end-to-end.
  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandLogo variant="icon" className="h-10" />
          <div>
            <p className="text-label font-bold uppercase tracking-wide text-ink">ASIL</p>
            <p className="text-caption text-ink-muted">Admin Dashboard</p>
          </div>
        </div>

        <Card>
          <CardBody>
            {sent ? (
              <div className="text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <MailCheck className="h-6 w-6" />
                </span>
                <h1 className="text-h3 font-bold text-ink">Check your email</h1>
                <p className="mt-2 text-body text-ink-muted">
                  If an account exists for that address, a password reset link has been sent.
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-h3 font-bold text-ink">Forgot password</h1>
                <p className="mt-1 text-body text-ink-muted">
                  Enter your email address and we&apos;ll send you a reset link.
                </p>
                <form onSubmit={handleSubmit(onSubmit, onFormInvalid)} className="mt-6 space-y-4">
                  <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                    <Input id="email" type="email" error={!!errors.email} {...register("email")} />
                  </FormField>
                  <Button type="submit" loading={isSubmitting} className="w-full">
                    Send reset link
                  </Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>

        <Link
          href="/admin/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-body font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
