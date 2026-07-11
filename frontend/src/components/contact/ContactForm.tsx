"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { ContactSchema, ContactFormValues } from "@/schemas/ContactSchema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({ resolver: zodResolver(ContactSchema) });

  // No backend endpoint exists yet for contact messages — simulates the round trip
  // so the form is fully usable; wire to a real endpoint once one exists.
  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSent(true);
    reset();
  };

  if (sent) {
    return (
      <div className="rounded-xl bg-card p-8 text-center shadow-soft">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-extrabold text-foreground">{t("successTitle")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("successBody")}</p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 text-sm font-bold text-primary hover:underline"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card p-6 shadow-soft sm:p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("subject")}</label>
          <Input placeholder={t("subjectPlaceholder")} error={!!errors.subject} {...register("subject")} />
          {errors.subject && <p className="mt-1 text-xs font-medium text-destructive">{errors.subject.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("message")}</label>
          <textarea
            rows={5}
            placeholder={t("messagePlaceholder")}
            className={cn(
              "flex w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-4 focus:ring-ring/20 resize-none",
              errors.message ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
            )}
            {...register("message")}
          />
          {errors.message && <p className="mt-1 text-xs font-medium text-destructive">{errors.message.message}</p>}
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}
