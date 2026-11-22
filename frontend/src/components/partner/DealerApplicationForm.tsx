"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, FileText, Loader2, Upload, Eye, AlertCircle, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import {
  requiredDocTypes,
  type DealerApplicationFields,
  type DealerDocType,
  type MyDealerApplication,
  type PartnerInfo,
} from "@/types/dealer";

type FieldKey = keyof DealerApplicationFields;
type Values = Record<FieldKey, string>;
type Errors = Record<string, string[]>;

const STEPS = ["business", "owner", "location", "documents", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Exclude<Step, "documents" | "review">, FieldKey[]> = {
  business: ["business_name", "business_type", "trade_licence_number", "trade_licence_expiry", "trn", "business_email", "business_phone", "whatsapp_number"],
  owner: ["owner_name", "owner_id_type", "owner_id_number"],
  location: ["address_line", "emirate", "city", "area", "po_box", "map_url", "latitude", "longitude", "notes"],
};

const OPTIONAL: FieldKey[] = ["trn", "whatsapp_number", "area", "po_box", "map_url", "latitude", "longitude", "notes"];

const EMPTY: Values = {
  business_name: "", business_type: "", trade_licence_number: "", trade_licence_expiry: "", trn: "",
  business_email: "", business_phone: "", whatsapp_number: "", owner_name: "", owner_id_type: "emirates_id",
  owner_id_number: "", address_line: "", emirate: "", city: "", area: "", po_box: "", map_url: "",
  latitude: "", longitude: "", notes: "",
};

function stepOfError(key: string): Step {
  if (key.startsWith("documents.")) return "documents";
  for (const s of ["business", "owner", "location"] as const) {
    if ((STEP_FIELDS[s] as string[]).includes(key)) return s;
  }
  return "review";
}

export function DealerApplicationForm() {
  const t = useTranslations("partner.apply");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();

  const [step, setStep] = useState<Step>("business");
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState<DealerDocType | null>(null);
  const hydrated = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login?next=/partner/apply" as any);
  }, [isAuthenticated, router]);

  const info = useQuery({
    queryKey: ["partner", "info"],
    queryFn: async () => (await apiClient.get("/partner/info")).data.data as PartnerInfo,
    staleTime: 5 * 60_000,
  });

  const mine = useQuery({
    queryKey: ["partner", "mine"],
    queryFn: async () => (await apiClient.get("/account/dealer")).data.data as MyDealerApplication | null,
    enabled: isAuthenticated && user?.role === "customer",
  });

  useEffect(() => {
    if (mine.data && !hydrated.current) {
      hydrated.current = true;
      const a = mine.data.application;
      setValues((prev) => {
        const next = { ...prev };
        (Object.keys(EMPTY) as FieldKey[]).forEach((k) => {
          const v = a[k];
          if (v !== null && v !== undefined) next[k] = String(v);
        });
        if (!a.owner_id_type) next.owner_id_type = "emirates_id";
        return next;
      });
    }
  }, [mine.data]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const app = mine.data ?? null;
  const editable = !app || app.editable;
  const docs = app?.documents ?? [];
  const neededDocs = useMemo(() => requiredDocTypes(values.owner_id_type, values.trn.trim() !== ""), [values.owner_id_type, values.trn]);
  const maxMb = info.data?.max_document_mb ?? 5;
  const stepIndex = STEPS.indexOf(step);

  const set = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest);
  };

  const applyServerErrors = (err: any, fallback: string) => {
    const map = err?.response?.data?.error;
    if (map && typeof map === "object") {
      setErrors(map as Errors);
      const first = Object.keys(map)[0];
      if (first) setStep(stepOfError(first));
      toast.error(err.response.data.message || fallback);
    } else {
      toast.error(err?.response?.data?.message || fallback);
    }
  };

  const saveStep = async (s: Step) => {
    if (s === "documents" || s === "review") return true;
    const payload: Partial<Values> = {};
    STEP_FIELDS[s].forEach((k) => (payload[k] = values[k]));
    if (s === "owner") payload.owner_id_type = values.owner_id_type;
    setSaving(true);
    try {
      const { data } = await apiClient.put("/account/dealer/application", payload);
      queryClient.setQueryData(["partner", "mine"], data.data);
      setErrors({});
      return true;
    } catch (err) {
      applyServerErrors(err, t("saveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (await saveStep(step)) setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  };

  const upload = async (docType: DealerDocType, file: File | undefined) => {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(t("docs.intro", { mb: maxMb }));
      return;
    }
    const form = new FormData();
    form.append("doc_type", docType);
    form.append("file", file);
    setUploading(docType);
    try {
      const { data } = await apiClient.post("/account/dealer/documents", form, { headers: { "Content-Type": "multipart/form-data" } });
      queryClient.setQueryData(["partner", "mine"], data.data);
      setErrors(({ [`documents.${docType}`]: _drop, ...rest }) => rest);
      toast.success(t("docs.uploaded"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("saveFailed"));
    } finally {
      setUploading(null);
    }
  };

  const viewDoc = async (id: number) => {
    // Open the tab first (inside the click) so pop-up blockers allow it, then load the
    // private file with the session cookie and show it from a blob URL.
    const win = window.open("", "_blank");
    try {
      const res = await apiClient.get(`/account/dealer/documents/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      win?.close();
      toast.error(t("saveFailed"));
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await apiClient.post("/account/dealer/submit");
      queryClient.setQueryData(["partner", "mine"], data.data);
      toast.success(t("submitted"));
      router.push("/partner" as any);
    } catch (err) {
      applyServerErrors(err, t("fixErrors"));
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || mine.isLoading || info.isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (user?.role !== "customer" || !editable || (!app && info.data && !info.data.registration_enabled)) {
    return (
      <main className="bg-background py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-primary" />
          <p className="text-base font-semibold text-foreground">{t("notEditable")}</p>
          <Link href="/partner" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            {t("back")}
          </Link>
        </div>
      </main>
    );
  }

  const errorFor = (k: string) => errors[k]?.[0];
  const label = (k: FieldKey, text?: string) => (
    <span className="mb-1.5 block text-sm font-semibold text-foreground">
      {text ?? t(`fields.${k}` as any)}
      {OPTIONAL.includes(k) && <span className="ms-1.5 text-xs font-normal text-muted-foreground">({t("optional")})</span>}
    </span>
  );
  const help = (text: string) => <span className="mt-1 block text-xs text-muted-foreground">{text}</span>;
  const err = (k: string) =>
    errorFor(k) ? (
      <span id={`${k}-error`} className="mt-1 block text-xs font-semibold text-destructive">
        {errorFor(k)}
      </span>
    ) : null;
  const field = (k: FieldKey, opts: { type?: string; helpText?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; dir?: "ltr" } = {}) => (
    <label className="block" htmlFor={`f-${k}`}>
      {label(k)}
      <Input
        id={`f-${k}`}
        type={opts.type ?? "text"}
        inputMode={opts.inputMode}
        dir={opts.dir}
        value={values[k]}
        onChange={set(k)}
        error={!!errorFor(k)}
        aria-invalid={!!errorFor(k)}
        aria-describedby={errorFor(k) ? `${k}-error` : undefined}
      />
      {opts.helpText && help(opts.helpText)}
      {err(k)}
    </label>
  );
  const select = (k: FieldKey, options: { value: string; label: string }[]) => (
    <label className="block" htmlFor={`f-${k}`}>
      {label(k)}
      <select
        id={`f-${k}`}
        value={values[k]}
        onChange={set(k)}
        aria-invalid={!!errorFor(k)}
        className={cn(
          "flex h-11 w-full rounded-xl border bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-ring/20",
          errorFor(k) ? "border-destructive" : "border-border focus:border-primary"
        )}
      >
        <option value="">{t("fields.choose")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {err(k)}
    </label>
  );

  const businessTypes = (info.data?.business_types ?? []).map((v) => ({ value: v, label: t(`businessTypes.${v}` as any) }));
  const emirates = (info.data?.emirates ?? []).map((v) => ({ value: v, label: v }));
  const docFor = (type: DealerDocType) => docs.find((d) => d.doc_type === type);

  return (
    <main className="bg-background pb-20 pt-24 md:pt-32">
      <div className="mx-auto max-w-3xl px-6">
        <Link href="/partner" className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t("back")}
        </Link>
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground text-balance sm:text-[34px]">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>

        {app?.info_request_message && (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-foreground">
            <p className="whitespace-pre-line">{app.info_request_message}</p>
          </div>
        )}

        {/* Progress */}
        <ol className="mt-8 grid grid-cols-5 gap-2" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li key={s} className="min-w-0">
                <button
                  type="button"
                  onClick={() => (i < stepIndex ? setStep(s) : undefined)}
                  disabled={i > stepIndex}
                  aria-current={current ? "step" : undefined}
                  className="w-full text-start disabled:cursor-default"
                >
                  <span className={cn("block h-1.5 rounded-full", done || current ? "bg-primary" : "bg-border")} />
                  <span className={cn("mt-2 block truncate text-xs font-bold", current ? "text-foreground" : "text-muted-foreground")}>
                    {t(`steps.${s}`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <section className="mt-8 rounded-xl bg-card p-6 shadow-soft md:p-8">
          <h2 ref={headingRef} tabIndex={-1} className="mb-6 text-lg font-extrabold text-foreground outline-none">
            {t(`steps.${step}`)}
          </h2>

          {step === "business" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("business_name")}</div>
              {select("business_type", businessTypes)}
              {field("trade_licence_number", { dir: "ltr" })}
              {field("trade_licence_expiry", { type: "date" })}
              {field("trn", { inputMode: "numeric", dir: "ltr", helpText: t("fields.trnHelp") })}
              {field("business_email", { type: "email", dir: "ltr" })}
              {field("business_phone", { type: "tel", dir: "ltr", helpText: t("fields.phoneHelp") })}
              {field("whatsapp_number", { type: "tel", dir: "ltr" })}
            </div>
          )}

          {step === "owner" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("owner_name")}</div>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-semibold text-foreground">{t("fields.owner_id_type")}</legend>
                <div className="flex flex-wrap gap-3">
                  {(["emirates_id", "driving_licence"] as const).map((type) => (
                    <label
                      key={type}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold",
                        values.owner_id_type === type ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <input
                        type="radio"
                        name="owner_id_type"
                        value={type}
                        checked={values.owner_id_type === type}
                        onChange={(e) => setValues((p) => ({ ...p, owner_id_type: e.target.value, owner_id_number: "" }))}
                        className="accent-primary"
                      />
                      {t(`idTypes.${type}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-2">
                {field("owner_id_number", {
                  dir: "ltr",
                  inputMode: values.owner_id_type === "emirates_id" ? "numeric" : undefined,
                  helpText: values.owner_id_type === "emirates_id" ? t("fields.emiratesIdHelp") : t("fields.licenceHelp"),
                })}
              </div>
            </div>
          )}

          {step === "location" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("address_line")}</div>
              {select("emirate", emirates)}
              {field("city")}
              {field("area")}
              {field("po_box", { inputMode: "numeric", dir: "ltr" })}
              <div className="sm:col-span-2">{field("map_url", { type: "url", dir: "ltr", helpText: t("fields.mapHelp") })}</div>
              {field("latitude", { inputMode: "decimal", dir: "ltr" })}
              {field("longitude", { inputMode: "decimal", dir: "ltr" })}
              <label className="block sm:col-span-2" htmlFor="f-notes">
                {label("notes")}
                <textarea
                  id="f-notes"
                  rows={3}
                  value={values.notes}
                  onChange={set("notes")}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/20"
                />
                {err("notes")}
              </label>
            </div>
          )}

          {step === "documents" && (
            <div>
              <p className="mb-5 text-sm text-muted-foreground">{t("docs.intro", { mb: maxMb })}</p>
              <ul className="flex flex-col gap-3">
                {neededDocs.map((type) => {
                  const doc = docFor(type);
                  const busy = uploading === type;
                  const errorKey = `documents.${type}`;
                  return (
                    <li
                      key={type}
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-xl border p-4",
                        errorFor(errorKey) ? "border-destructive" : "border-border"
                      )}
                    >
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", doc ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground")}>
                        {doc ? <Check className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{t(`docs.${type}`)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {doc ? doc.original_name : t("docs.required")}
                        </p>
                        {errorFor(errorKey) && <p className="text-xs font-semibold text-destructive">{t("docs.missing")}</p>}
                      </div>
                      {doc && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => viewDoc(doc.id)}>
                          <Eye className="h-4 w-4" />
                          {t("docs.view")}
                        </Button>
                      )}
                      <label className={cn("inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-border bg-card px-3.5 text-xs font-bold uppercase tracking-wide text-foreground hover:bg-secondary", busy && "pointer-events-none opacity-60")}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {busy ? t("docs.uploading") : doc ? t("docs.replace") : t("docs.upload")}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="sr-only"
                          disabled={busy}
                          onChange={(e) => {
                            upload(type, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step === "review" && (
            <div>
              <p className="mb-6 text-sm text-muted-foreground">{t("review.body")}</p>
              {(["business", "owner", "location"] as const).map((s) => (
                <div key={s} className="mb-5 border-b border-border pb-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-foreground">{t(`steps.${s}`)}</h3>
                    <button type="button" onClick={() => setStep(s)} className="text-xs font-bold text-primary hover:underline">
                      {t("review.edit")}
                    </button>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {STEP_FIELDS[s]
                      .filter((k) => values[k] !== "")
                      .map((k) => (
                        <div key={k} className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{t(`fields.${k}` as any)}</dt>
                          <dd className={cn("break-words text-sm font-semibold", errorFor(k) ? "text-destructive" : "text-foreground")}>
                            {k === "business_type" ? t(`businessTypes.${values[k]}` as any) : k === "owner_id_type" ? t(`idTypes.${values[k]}` as any) : values[k]}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-foreground">{t("review.documents")}</h3>
                <ul className="flex flex-col gap-1">
                  {neededDocs.map((type) => (
                    <li key={type} className="flex items-center gap-2 text-sm">
                      {docFor(type) ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                      {t(`docs.${type}`)}
                    </li>
                  ))}
                </ul>
              </div>
              {Object.keys(errors).length > 0 && (
                <p className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{t("fixErrors")}</p>
              )}
              <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                {t("review.consent")}
              </label>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(STEPS[Math.max(stepIndex - 1, 0)])}
              disabled={stepIndex === 0 || saving}
            >
              {t("back")}
            </Button>
            {step === "review" ? (
              <Button type="button" onClick={submit} disabled={!consent || saving} loading={saving}>
                {saving ? t("submitting") : t("submit")}
              </Button>
            ) : (
              <Button type="button" onClick={next} disabled={saving || uploading !== null} loading={saving}>
                {saving ? t("saving") : t("next")}
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
