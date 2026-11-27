"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, ChevronLeft, Loader2, Printer, Send, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import { QuotationStatusPill } from "@/components/account/QuotationStatusPill";
import { PaymentMethodPicker } from "@/components/checkout/PaymentMethodPicker";
import apiClient from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { PaymentMethodCode } from "@/types/order";
import type { DealerQuotation, QuotationMessage, QuotationVersion } from "@/types/quotation";

const money = (v: number | string, currency = "AED") =>
  `${currency} ${Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toDate = (v: string) => new Date(v.replace(" ", "T"));

// Print only the quotation sheet, not the site header, account menu or footer.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #quotation-sheet, #quotation-sheet * { visibility: visible !important; }
  #quotation-sheet { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 0; }
  @page { margin: 16mm; }
}`;

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("quotations");
  const tAccount = useTranslations("account");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const queryKey = ["dealer-quotation", id];
  const query = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get(`/account/dealer/quotations/${id}`)).data.data as DealerQuotation,
    retry: false,
  });
  const q = query.data;

  const [method, setMethod] = useState<PaymentMethodCode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [message, setMessage] = useState("");

  // Pre-select the dealer's preferred method if it can still be used, else the first usable one.
  useEffect(() => {
    if (!q?.can_accept) return;
    const usable = q.payment_methods.filter((m) => m.available).map((m) => m.code);
    if (method && usable.includes(method)) return;
    const pref = q.payment_method_pref as PaymentMethodCode | null;
    setMethod(pref && usable.includes(pref) ? pref : usable[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const errorMessage = (err: any) => err?.response?.data?.message || t("error");
  const refresh = (data?: DealerQuotation) => {
    if (data) queryClient.setQueryData(queryKey, data);
    queryClient.invalidateQueries({ queryKey: ["dealer-quotations"] });
  };

  const accept = useMutation({
    mutationFn: async () => (await apiClient.post(`/account/dealer/quotations/${id}/accept`, { payment_method: method })).data.data,
    onSuccess: (data) => {
      toast.success(t("accepted"));
      queryClient.invalidateQueries({ queryKey: ["partner", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-payment-methods"] });
      refresh(data.quotation);
      router.push(`/account/orders/${data.order.id}` as any);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      setConfirmOpen(false);
      query.refetch();
    },
  });

  const decline = useMutation({
    mutationFn: async () => (await apiClient.post(`/account/dealer/quotations/${id}/reject`, { reason: declineReason.trim() || undefined })).data.data as DealerQuotation,
    onSuccess: (data) => {
      toast.success(data.status === "cancelled" ? t("withdrawn") : t("declined"));
      setDeclining(false);
      setDeclineReason("");
      refresh(data);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const send = useMutation({
    mutationFn: async () => (await apiClient.post(`/account/dealer/quotations/${id}/messages`, { body: message.trim() })).data.data as DealerQuotation,
    onSuccess: (data) => {
      toast.success(t("messageSent"));
      setMessage("");
      refresh(data);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!q) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {t("notFound")}{" "}
        <Link href="/account/quotations" className="font-semibold text-primary hover:underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  const name = (item: { name_en: string; name_ar: string | null }) => (locale === "ar" && item.name_ar ? item.name_ar : item.name_en);
  const dateTime = (v: string) => format.dateTime(toDate(v), { dateStyle: "medium", timeStyle: "short" });
  const isWithdraw = !["approved", "revised"].includes(q.status);
  const addr = q.shipping_address;

  return (
    <div className="flex flex-col gap-6">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between print:hidden">
        <div>
          <Link href="/account/quotations" className="mb-2 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-black">{q.quotation_number}</h1>
            <QuotationStatusPill status={q.status} />
            {q.is_first_order && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">{t("firstOrder")}</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("version", { number: q.current_version })}
            {q.submitted_at ? ` · ${t("submittedOn", { date: dateTime(q.submitted_at) })}` : ""}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => window.print()} className="gap-2 self-start md:self-auto">
          <Printer className="h-4 w-4" /> {t("print")}
        </Button>
      </div>

      <div
        className={cn(
          "rounded-xl border p-4 text-sm print:hidden",
          q.status === "approved" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : q.status === "discussion_required" ? "border-amber-300 bg-amber-50 text-amber-900" : "bg-card"
        )}
      >
        <p className="font-semibold">{t(`statusHelp.${q.status}`, { number: q.converted_order?.order_number ?? "" })}</p>
        {q.status === "approved" && q.expires_at && <p className="mt-1">{t("validUntil", { date: dateTime(q.expires_at) })}</p>}
        {q.rejection_reason && (q.status === "rejected" || q.status === "cancelled") && (
          <p className="mt-1 whitespace-pre-line">
            {t("reason")}: {q.rejection_reason}
          </p>
        )}
        {q.converted_order && (
          <Link href={`/account/orders/${q.converted_order.id}` as any} className="mt-2 inline-block font-semibold text-primary hover:underline">
            {t("viewOrder")}
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* The printable sheet */}
        <div id="quotation-sheet" className="flex min-w-0 flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm print:border-0 print:shadow-none">
          <div className="hidden print:block">
            <div className="flex items-start justify-between gap-6 border-b pb-4">
              <div>
                <p className="text-2xl font-black">{t("printTitle")}</p>
                <p className="font-mono text-sm">{q.quotation_number} · {t("version", { number: q.current_version })}</p>
                <p className="text-sm">
                  {t("printDate")}: {format.dateTime(toDate(q.updated_at), { dateStyle: "long" })}
                </p>
                {q.expires_at && q.status === "approved" && <p className="text-sm">{t("validUntil", { date: dateTime(q.expires_at) })}</p>}
              </div>
              <div className="text-end text-sm">
                <p className="text-xs uppercase text-muted-foreground">{t("printFrom")}</p>
                <p className="font-bold">{q.company.name}</p>
                {q.company.address && <p>{q.company.address}</p>}
                {(q.company.phone || q.company.email) && <p>{[q.company.phone, q.company.email].filter(Boolean).join(" · ")}</p>}
                {q.company.trn && <p>{t("printTrn")}: {q.company.trn}</p>}
              </div>
            </div>
            <div className="mt-4 text-sm">
              <p className="text-xs uppercase text-muted-foreground">{t("printTo")}</p>
              <p className="font-bold">{q.dealer.business_name}</p>
              <p>{[q.dealer.address_line, q.dealer.city, q.dealer.emirate].filter(Boolean).join(", ")}</p>
              <p>
                {t("printDealerCode")}: {q.dealer.dealer_code}
                {q.dealer.trn ? ` · ${t("printTrn")}: ${q.dealer.trn}` : ""}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pe-3 text-start font-semibold">{t("colItem")}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t("colQty")}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t("colUnit")}</th>
                  <th className="py-2 ps-3 text-end font-semibold">{t("colTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3 pe-3">
                      <p className="font-semibold text-foreground">{name(item)}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
                    </td>
                    <td className="px-3 py-3 text-end tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-3 text-end tabular-nums" dir="ltr">
                      <span className="block">{money(item.unit_price, q.currency)}</span>
                      {item.retail_unit_price > item.unit_price && (
                        <span className="block text-xs text-muted-foreground line-through">{money(item.retail_unit_price, q.currency)}</span>
                      )}
                    </td>
                    <td className="py-3 ps-3 text-end font-semibold tabular-nums" dir="ltr">
                      {money(item.line_total, q.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ms-auto flex w-full max-w-xs flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("subtotal")}</dt>
              <dd className="tabular-nums" dir="ltr">{money(q.subtotal, q.currency)}</dd>
            </div>
            {q.discount_amount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("discount")}</dt>
                <dd className="tabular-nums text-primary" dir="ltr">-{money(q.discount_amount, q.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("shipping")}</dt>
              <dd className="tabular-nums" dir="ltr">{q.shipping_amount > 0 ? money(q.shipping_amount, q.currency) : t("free")}</dd>
            </div>
            {q.vat_amount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("vat", { rate: q.vat_rate })}</dt>
                <dd className="tabular-nums" dir="ltr">{money(q.vat_amount, q.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-extrabold">
              <dt>{t("total")}</dt>
              <dd className="tabular-nums" dir="ltr">{money(q.total, q.currency)}</dd>
            </div>
          </dl>

          <div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
            {addr && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("delivery")}</p>
                <p className="mt-1 text-foreground">{addr.name}</p>
                <p className="text-muted-foreground">
                  {[addr.building, addr.apartment, addr.street, addr.area, addr.emirate].filter(Boolean).join(", ")}
                </p>
                {addr.phone && <p className="text-muted-foreground" dir="ltr">{addr.phone}</p>}
              </div>
            )}
            {q.payment_method_label && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("paymentPref")}</p>
                <p className="mt-1 text-foreground">{q.payment_method_label}</p>
              </div>
            )}
          </div>
          <p className="hidden text-xs text-muted-foreground print:block">{t("printNote")}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-6 print:hidden">
          {q.can_accept && (
            <div className="rounded-xl border border-emerald-300 bg-card p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("acceptTitle")}</h2>
              <p className="mb-3 text-sm font-semibold">{t("choosePayment")}</p>
              <PaymentMethodPicker
                data={{ channel: "b2b", quotation_required: false, methods: q.payment_methods, bank_transfer: q.bank_transfer }}
                loading={false}
                value={method}
                onChange={setMethod}
                total={q.total}
              />
              <Button className="mt-4 w-full gap-2" disabled={!method || accept.isPending} onClick={() => setConfirmOpen(true)}>
                <CheckCircle2 className="h-4 w-4" /> {t("acceptButton")}
              </Button>
            </div>
          )}

          {q.can_decline && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              {!declining ? (
                <Button variant="secondary" className="w-full gap-2 text-destructive" onClick={() => setDeclining(true)}>
                  <XCircle className="h-4 w-4" /> {isWithdraw ? t("withdrawButton") : t("declineButton")}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="font-semibold">{isWithdraw ? t("withdrawTitle") : t("declineTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("declineBody")}</p>
                  <label className="text-sm font-medium" htmlFor="decline-reason">
                    {t("reasonOptional")}
                  </label>
                  <textarea
                    id="decline-reason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDeclining(false)}>
                      {tAccount("cancel")}
                    </Button>
                    <Button variant="danger" size="sm" className="flex-1" loading={decline.isPending} onClick={() => decline.mutate()}>
                      {isWithdraw ? t("withdrawButton") : t("declineButton")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Messages
            messages={q.messages}
            canSend={q.can_message}
            value={message}
            onChange={setMessage}
            sending={send.isPending}
            onSend={() => message.trim() && send.mutate()}
          />

          <Versions versions={q.versions} current={q.current_version} currency={q.currency} name={name} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmTitle")}
        description={t("confirmBody", { total: money(q.total, q.currency) })}
        confirmLabel={t("acceptButton")}
        isDestructive={false}
        isLoading={accept.isPending}
        onConfirm={() => accept.mutate()}
      />
    </div>
  );
}

function Messages({
  messages,
  canSend,
  value,
  onChange,
  sending,
  onSend,
}: {
  messages: QuotationMessage[];
  canSend: boolean;
  value: string;
  onChange: (v: string) => void;
  sending: boolean;
  onSend: () => void;
}) {
  const t = useTranslations("quotations");
  const format = useFormatter();
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("messages")}</h2>
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMessages")}</p>
      ) : (
        <ol className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {messages.map((m) =>
            m.author_role === "system" ? (
              <li key={m.id} className="text-center text-xs text-muted-foreground">
                {m.body} · {format.dateTime(toDate(m.created_at), { dateStyle: "medium", timeStyle: "short" })}
              </li>
            ) : (
              <li
                key={m.id}
                className={cn("max-w-[90%] rounded-lg px-3 py-2 text-sm", m.author_role === "dealer" ? "ms-auto bg-primary/10" : "bg-secondary")}
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  {m.author_role === "dealer" ? t("you") : t("team")} · {format.dateTime(toDate(m.created_at), { dateStyle: "short", timeStyle: "short" })}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-foreground">{m.body}</p>
              </li>
            )
          )}
        </ol>
      )}
      {canSend && (
        <div className="mt-4 flex flex-col gap-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("messagePlaceholder")}
            aria-label={t("messagePlaceholder")}
            maxLength={2000}
            rows={3}
            className="rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button size="sm" className="gap-2 self-end" disabled={!value.trim()} loading={sending} onClick={onSend}>
            <Send className="h-4 w-4 rtl:-scale-x-100" /> {t("send")}
          </Button>
        </div>
      )}
    </div>
  );
}

function Versions({
  versions,
  current,
  currency,
  name,
}: {
  versions: QuotationVersion[];
  current: number;
  currency: string;
  name: (i: { name_en: string; name_ar: string | null }) => string;
}) {
  const t = useTranslations("quotations");
  const format = useFormatter();
  const [open, setOpen] = useState<number | null>(null);
  if (versions.length <= 1) return null;
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("versions")}</h2>
      <ol className="flex flex-col divide-y">
        {versions.map((v) => (
          <li key={v.version_no} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {t("version", { number: v.version_no })}
                  {v.version_no === current && <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t("current")}</span>}
                </p>
                {v.reason && <p className="mt-0.5 text-sm text-muted-foreground">{v.reason}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">{format.dateTime(toDate(v.created_at), { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums" dir="ltr">
                {money(v.snapshot.total, currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(open === v.version_no ? null : v.version_no)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              aria-expanded={open === v.version_no}
            >
              {open === v.version_no ? t("hideItems") : t("showItems")}
              <ChevronDown className={cn("h-3 w-3 transition-transform", open === v.version_no && "rotate-180")} />
            </button>
            {open === v.version_no && (
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {v.snapshot.items.map((i) => (
                  <li key={i.product_id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {i.quantity} × {name(i)}
                    </span>
                    <span className="shrink-0 tabular-nums" dir="ltr">
                      {money(i.unit_price, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
