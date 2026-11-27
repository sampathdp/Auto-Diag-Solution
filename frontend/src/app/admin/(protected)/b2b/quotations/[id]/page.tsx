"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ChevronDown, Lock, MessageSquare, Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { Card, CardBody, CardHeader } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Select } from "@/components/admin/ui/Select";
import { Checkbox } from "@/components/admin/ui/Checkbox";
import { FormField } from "@/components/admin/ui/FormField";
import { Modal } from "@/components/admin/ui/Modal";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { ReasonModal } from "@/components/admin/b2b/DealerActionModals";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDateTime } from "@/lib/admin/utils";
import { hasPermission, PERMISSIONS } from "@/lib/admin/permissions";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Product } from "@/types/product";
import { QUOTATION_STATUS_LABEL, type AdminQuotation, type QuotationVersion } from "@/types/quotation";

type FieldErrors = Record<string, string[]>;

interface EditLine {
  product_id: number;
  sku: string;
  name: string;
  quantity: string;
  unit_price: string;
  vat_inclusive: boolean;
  retail: number | null;
  wholesale: number | null;
}

const aed = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : `AED ${Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const VAT_RATE = 5;

/** Same arithmetic as App\Services\OrderTotals, for the preview only; the server recomputes on save. */
function previewTotals(lines: EditLine[], shipping: number, discount: number) {
  let subtotal = 0;
  let vat = 0;
  for (const l of lines) {
    const total = Math.round(Number(l.unit_price || 0) * Number(l.quantity || 0) * 100) / 100;
    if (l.vat_inclusive) {
      const ex = Math.round((total / (1 + VAT_RATE / 100)) * 100) / 100;
      subtotal += ex;
      vat += Math.round((total - ex) * 100) / 100;
    } else {
      subtotal += total;
    }
  }
  subtotal = Math.round(subtotal * 100) / 100;
  vat = Math.round((vat + (shipping > 0 ? shipping * (VAT_RATE / 100) : 0)) * 100) / 100;
  return { subtotal, vat, total: Math.round((subtotal - discount + shipping + vat) * 100) / 100 };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-1.5">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="break-words text-body text-ink">{children ?? "—"}</dd>
    </div>
  );
}

export default function AdminQuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.permissions);
  const canManage = hasPermission(permissions, PERMISSIONS.B2B_QUOTATIONS_MANAGE);
  const canApprove = hasPermission(permissions, PERMISSIONS.B2B_QUOTATIONS_APPROVE);

  const query = useAdminQuery<AdminQuotation>(adminQueryKeys.b2bQuotations.detail(id), `/b2b/quotations/${id}`);
  const q = query.data;

  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<null | "approve" | "reject">(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = (data: AdminQuotation, message: string) => {
    queryClient.setQueryData(adminQueryKeys.b2bQuotations.detail(id), data);
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.b2bQuotations.all });
    setErrors({});
    showSuccess(message);
  };
  const fail = (err: unknown) => {
    if (err instanceof ApiError && err.details && typeof err.details === "object") setErrors(err.details as FieldErrors);
    showError(err instanceof ApiError ? err.message : "Something went wrong.");
    if (err instanceof ApiError && err.status === 409) query.refetch();
  };

  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => adminApi.post<AdminQuotation>(`/b2b/quotations/${id}/${path}`, body),
    onSuccess: (data, vars) => {
      const messages: Record<string, string> = {
        "start-review": "Review started",
        revise: "New version saved. The dealer has been emailed.",
        approve: "Quotation approved. The dealer has been emailed and can accept it.",
        reject: "Quotation rejected. The dealer has been emailed.",
        messages: "Message added",
      };
      save(data, messages[vars.path] ?? "Saved");
      setDialog(null);
      if (vars.path === "revise") setEditing(false);
    },
    onError: fail,
  });

  if (query.isLoading) return <FullScreenLoader label="Loading quotation…" />;
  if (!q) {
    return (
      <div className="py-20 text-center text-body text-ink-muted">
        This quotation could not be found. <Link href="/admin/b2b/quotations" className="text-primary underline">Back to quotations</Link>
      </div>
    );
  }

  const closed = !q.allowed.message;

  return (
    <div>
      <Link href="/admin/b2b/quotations" className="mb-4 inline-flex items-center gap-1.5 text-body text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Quotations
      </Link>

      <PageHeader
        title={q.quotation_number}
        description={[q.dealer.business_name, q.dealer.dealer_code, QUOTATION_STATUS_LABEL[q.status], `version ${q.current_version}`, q.is_first_order ? "first order" : null]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2">
            {q.allowed.start_review && canManage && (
              <Button variant="secondary" loading={action.isPending && action.variables?.path === "start-review"} onClick={() => action.mutate({ path: "start-review" })}>
                Start review
              </Button>
            )}
            {q.allowed.revise && canManage && !editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Revise
              </Button>
            )}
            {q.allowed.reject && canApprove && (
              <Button variant="danger" onClick={() => setDialog("reject")}>
                Reject
              </Button>
            )}
            {q.allowed.approve && canApprove && !editing && (
              <Button onClick={() => { setErrors({}); setDialog("approve"); }}>Approve and send to dealer</Button>
            )}
          </div>
        }
      />

      {!canApprove && (q.allowed.approve || q.allowed.reject) && (
        <p className="mb-4 flex items-center gap-2 text-caption text-ink-muted">
          <Lock className="h-3.5 w-3.5" /> Approving or rejecting needs the "Approve or reject quotations" permission.
        </p>
      )}

      <StatusBanner q={q} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {editing ? (
            <ReviseForm q={q} errors={errors} saving={action.isPending} onCancel={() => { setEditing(false); setErrors({}); }} onSave={(body) => action.mutate({ path: "revise", body })} />
          ) : (
            <LinesCard q={q} />
          )}
          <VersionsCard versions={q.versions} current={q.current_version} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-h4 font-bold text-ink">Dealer</h2>
            </CardHeader>
            <CardBody>
              <dl>
                <Row label="Business">
                  {q.dealer.id ? (
                    <Link href={`/admin/b2b/dealers/${q.dealer.id}`} className="text-primary hover:underline">
                      {q.dealer.business_name}
                    </Link>
                  ) : null}
                </Row>
                <Row label="Dealer code"><span className="font-mono">{q.dealer.dealer_code}</span></Row>
                <Row label="Status">
                  {q.dealer.status ? <StatusBadge status={q.dealer.status} /> : null}
                  {!q.dealer.is_active && q.dealer.status === "approved" && <span className="ml-2 text-caption text-warning">not active now</span>}
                </Row>
                <Row label="Contact">{[q.dealer.contact_name, q.dealer.email].filter(Boolean).join(" · ")}</Row>
                <Row label="Phone"><span className="font-mono">{q.dealer.phone}</span></Row>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><Truck className="h-4 w-4" />Delivery and payment</h2>
            </CardHeader>
            <CardBody>
              <dl>
                <Row label="Deliver to">
                  {q.shipping_address
                    ? [q.shipping_address.name, q.shipping_address.building, q.shipping_address.street, q.shipping_address.area, q.shipping_address.emirate].filter(Boolean).join(", ")
                    : null}
                </Row>
                <Row label="Phone"><span className="font-mono">{q.shipping_address?.phone}</span></Row>
                <Row label="Pays by">{q.payment_method_label}</Row>
                <Row label="Sent">{q.submitted_at ? formatDateTime(q.submitted_at) : null}</Row>
                <Row label="Approved">{q.approved_at ? `${formatDateTime(q.approved_at)}${q.approved_by_name ? ` by ${q.approved_by_name}` : ""}` : null}</Row>
                <Row label="Expires">{q.expires_at ? formatDateTime(q.expires_at) : null}</Row>
              </dl>
            </CardBody>
          </Card>

          <MessagesCard q={q} canManage={canManage} closed={closed} sending={action.isPending && action.variables?.path === "messages"} error={errors.body?.[0]} onSend={(body) => action.mutate({ path: "messages", body })} />
        </div>
      </div>

      <ApproveModal
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        error={errors.expires_at?.[0]}
        q={q}
        onSubmit={(expires_at) => action.mutate({ path: "approve", body: { expires_at } })}
      />
      <ReasonModal
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        error={errors.reason?.[0]}
        title="Reject quotation"
        description="The dealer is emailed the reason. A rejected first quotation keeps the first-order requirement: their next checkout is a new request."
        label="Reason"
        confirmLabel="Reject quotation"
        danger
        onSubmit={(reason) => action.mutate({ path: "reject", body: { reason } })}
      />
    </div>
  );
}

function StatusBanner({ q }: { q: AdminQuotation }) {
  let tone = "border-border bg-surface";
  let text: React.ReactNode = null;
  switch (q.status) {
    case "submitted":
      text = "New request. Check prices and stock, then revise or approve.";
      break;
    case "discussion_required":
      tone = "border-warning/30 bg-warning/10";
      text = "Waiting for the dealer to reply to your question.";
      break;
    case "revised":
      text = "Revised and shown to the dealer. Approve it when it is final so they can accept.";
      break;
    case "approved":
      tone = "border-success/30 bg-success/10";
      text = `Sent to the dealer. They can accept it until ${q.expires_at ? formatDateTime(q.expires_at) : "it expires"}. Revising it takes it back for re-approval.`;
      break;
    case "converted":
      tone = "border-success/30 bg-success/10";
      text = q.converted_order ? (
        <>
          Accepted by the dealer and placed as order{" "}
          <Link href={`/admin/orders/${q.converted_order.id}`} className="font-semibold text-primary underline">
            {q.converted_order.order_number}
          </Link>
          .
        </>
      ) : (
        "Accepted by the dealer."
      );
      break;
    case "rejected":
      tone = "border-danger/30 bg-danger/10";
      text = `${q.rejected_by_role === "dealer" ? "Declined by the dealer" : "Rejected"}${q.rejection_reason ? `: ${q.rejection_reason}` : "."}`;
      break;
    case "cancelled":
      text = `Withdrawn by the dealer${q.rejection_reason ? `: ${q.rejection_reason}` : "."}`;
      break;
    case "expired":
      text = "The dealer didn't accept the offer before it expired. They need to send a new request.";
      break;
  }
  if (!text) return null;
  return <div className={cn("mb-6 rounded-lg border px-4 py-3 text-body text-ink", tone)}>{text}</div>;
}

function LinesCard({ q }: { q: AdminQuotation }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Lines (version {q.current_version})</h2>
      </CardHeader>
      <CardBody className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border text-left text-caption text-ink-muted">
              <th className="py-2 pr-3 font-semibold">Item</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Quoted unit</th>
              <th className="px-3 py-2 text-right font-semibold">Now: wholesale / retail</th>
              <th className="px-3 py-2 text-right font-semibold">Stock</th>
              <th className="py-2 pl-3 text-right font-semibold">Line total</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((i) => {
              const short = i.stock && i.stock.track_inventory && i.stock.stock_quantity < i.quantity;
              const belowWholesale = i.current_wholesale_price !== null && i.unit_price < i.current_wholesale_price;
              return (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink">{i.name_en}</p>
                    <p className="font-mono text-caption text-ink-muted">{i.sku}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{i.quantity}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", belowWholesale && "text-warning")}>{aed(i.unit_price)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-caption tabular-nums text-ink-muted">
                    {aed(i.current_wholesale_price)} / {aed(i.current_retail_price)}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", short && "font-semibold text-danger")}>
                    {!i.stock ? "—" : i.stock.status !== "active" ? "not on sale" : i.stock.track_inventory ? i.stock.stock_quantity : i.stock.stock_status.replace(/_/g, " ")}
                    {short && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" aria-label="Not enough stock" />}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums">{aed(i.line_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-body">
          <div className="flex justify-between"><dt className="text-ink-muted">Subtotal (before VAT)</dt><dd className="font-mono">{aed(q.subtotal)}</dd></div>
          {q.discount_amount > 0 && <div className="flex justify-between"><dt className="text-ink-muted">Discount</dt><dd className="font-mono">-{aed(q.discount_amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-muted">Shipping</dt><dd className="font-mono">{aed(q.shipping_amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">VAT</dt><dd className="font-mono">{aed(q.vat_amount)}</dd></div>
          <div className="flex justify-between border-t border-border pt-1 font-bold"><dt>Total</dt><dd className="font-mono">{aed(q.total)}</dd></div>
        </dl>
        <p className="mt-3 text-caption text-ink-muted">Stock is not reserved by a quotation. It is taken when the dealer accepts; if there isn't enough then, the dealer is asked to contact you.</p>
      </CardBody>
    </Card>
  );
}

function ReviseForm({
  q,
  errors,
  saving,
  onCancel,
  onSave,
}: {
  q: AdminQuotation;
  errors: FieldErrors;
  saving: boolean;
  onCancel: () => void;
  onSave: (body: unknown) => void;
}) {
  const [lines, setLines] = useState<EditLine[]>(() =>
    q.items.map((i) => ({
      product_id: i.product_id,
      sku: i.sku,
      name: i.name_en,
      quantity: String(i.quantity),
      unit_price: i.unit_price.toFixed(2),
      vat_inclusive: i.vat_inclusive,
      retail: i.current_retail_price,
      wholesale: i.current_wholesale_price,
    }))
  );
  const [shipping, setShipping] = useState(q.shipping_amount.toFixed(2));
  const [discount, setDiscount] = useState(q.discount_amount.toFixed(2));
  const [expires, setExpires] = useState(q.expires_at ? q.expires_at.slice(0, 10) : "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(h);
  }, [search]);

  const results = useQuery({
    queryKey: ["admin", "products", "quotation-picker", debounced],
    queryFn: () => adminApi.get<PaginatedResponse<Product>>("/products", { search: debounced, status: "active", per_page: 8 }),
    enabled: debounced.length >= 2,
  });

  const preview = useMemo(() => previewTotals(lines, Number(shipping) || 0, Number(discount) || 0), [lines, shipping, discount]);
  const update = (index: number, patch: Partial<EditLine>) => setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const err = (key: string) => errors[key]?.[0];

  const add = (p: Product) => {
    if (lines.some((l) => l.product_id === p.id)) return;
    setLines((ls) => [
      ...ls,
      {
        product_id: p.id,
        sku: p.sku,
        name: p.name_en,
        quantity: "1",
        unit_price: Number(p.wholesale_price ?? p.price).toFixed(2),
        vat_inclusive: Boolean(p.vat_inclusive),
        retail: Number(p.price),
        wholesale: p.wholesale_price !== null ? Number(p.wholesale_price) : null,
      },
    ]);
    setSearch("");
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">New version {q.current_version + 1}</h2>
        <p className="mt-1 text-caption text-ink-muted">
          Version {q.current_version} stays in the history. {q.status === "approved" ? "Saving takes the approval back: approve again once it's final." : "The dealer sees the new version straight away."}
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        {err("items") && <p className="text-caption text-danger">{err("items")}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border text-left text-caption text-ink-muted">
                <th className="py-2 pr-3 font-semibold">Item</th>
                <th className="w-24 px-2 py-2 font-semibold">Qty</th>
                <th className="w-32 px-2 py-2 font-semibold">Unit price (AED)</th>
                <th className="px-2 py-2 text-right font-semibold">Line total</th>
                <th className="w-10 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, index) => {
                const below = l.wholesale !== null && Number(l.unit_price) < l.wholesale;
                return (
                  <tr key={l.product_id} className="border-b border-border align-top last:border-0">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-ink">{l.name}</p>
                      <p className="font-mono text-caption text-ink-muted">
                        {l.sku} · wholesale {aed(l.wholesale)} · retail {aed(l.retail)}
                      </p>
                      {err(`items.${index}.product_id`) && <p className="text-caption text-danger">{err(`items.${index}.product_id`)}</p>}
                    </td>
                    <td className="px-2 py-2">
                      <Input aria-label={`Quantity for ${l.sku}`} inputMode="numeric" value={l.quantity} onChange={(e) => update(index, { quantity: e.target.value.replace(/[^\d]/g, "") })} />
                      {err(`items.${index}.quantity`) && <p className="text-caption text-danger">{err(`items.${index}.quantity`)}</p>}
                    </td>
                    <td className="px-2 py-2">
                      <Input aria-label={`Unit price for ${l.sku}`} inputMode="decimal" value={l.unit_price} onChange={(e) => update(index, { unit_price: e.target.value.replace(/[^\d.]/g, "") })} />
                      {below && <p className="mt-1 text-caption text-warning">Below the wholesale price</p>}
                      {err(`items.${index}.unit_price`) && <p className="text-caption text-danger">{err(`items.${index}.unit_price`)}</p>}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">{aed(Math.round(Number(l.unit_price || 0) * Number(l.quantity || 0) * 100) / 100)}</td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" size="sm" aria-label={`Remove ${l.sku}`} disabled={lines.length <= 1} onClick={() => setLines((ls) => ls.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="relative">
          <FormField label="Add a product" htmlFor="quote-add">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input id="quote-add" placeholder="Search by SKU or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </FormField>
          {debounced.length >= 2 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
              {results.isLoading && <li className="px-3 py-2 text-caption text-ink-muted">Searching…</li>}
              {results.data?.items.length === 0 && <li className="px-3 py-2 text-caption text-ink-muted">No active products match.</li>}
              {results.data?.items.map((p) => {
                const already = lines.some((l) => l.product_id === p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => add(p)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-body hover:bg-app disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{p.name_en}</span>
                        <span className="block font-mono text-caption text-ink-muted">{p.sku} · stock {p.stock_quantity}</span>
                      </span>
                      <span className="shrink-0 text-caption">{already ? "on quotation" : <Plus className="h-4 w-4" />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Shipping (AED)" htmlFor="quote-shipping" error={err("shipping_amount")}>
            <Input id="quote-shipping" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value.replace(/[^\d.]/g, ""))} />
          </FormField>
          <FormField label="Discount (AED)" htmlFor="quote-discount" error={err("discount_amount")} helperText="Off the subtotal before VAT">
            <Input id="quote-discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))} />
          </FormField>
          <FormField label="Valid until" htmlFor="quote-expiry" error={err("expires_at")} helperText="Optional. Set again when approving.">
            <Input id="quote-expiry" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </FormField>
        </div>

        <div className="rounded-md bg-app px-4 py-3 text-body">
          <span className="text-ink-muted">Preview: </span>
          subtotal {aed(preview.subtotal)} · VAT {aed(preview.vat)} · <strong>total {aed(preview.total)}</strong>
          <span className="block text-caption text-ink-muted">The server recalculates the totals when you save.</span>
        </div>

        <FormField label="What changed" htmlFor="quote-reason" required error={err("reason")} helperText="Shown to the dealer with the new version.">
          <Input id="quote-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="e.g. Pump quantity raised to 6, brake pads at a better price" />
        </FormField>
        <FormField label="Message to the dealer (optional)" htmlFor="quote-message" error={err("message")}>
          <Textarea id="quote-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
        </FormField>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            loading={saving}
            disabled={reason.trim().length < 3 || lines.length === 0}
            onClick={() =>
              onSave({
                items: lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_price: l.unit_price })),
                shipping_amount: shipping || "0",
                discount_amount: discount || "0",
                expires_at: expires || null,
                reason: reason.trim(),
                message: message.trim() || null,
              })
            }
          >
            Save version {q.current_version + 1}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function VersionsCard({ versions, current }: { versions: QuotationVersion[]; current: number }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Versions</h2>
      </CardHeader>
      <CardBody>
        <ol className="divide-y divide-border">
          {versions.map((v) => (
            <li key={v.version_no} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    Version {v.version_no}
                    {v.version_no === current && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-caption text-primary">current</span>}
                  </p>
                  {v.reason && <p className="text-body text-ink">{v.reason}</p>}
                  <p className="text-caption text-ink-muted">
                    {formatDateTime(v.created_at)}
                    {v.created_by_name ? ` · ${v.created_by_name}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-mono tabular-nums">{aed(v.snapshot.total)}</p>
              </div>
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-caption font-semibold text-primary"
                aria-expanded={open === v.version_no}
                onClick={() => setOpen(open === v.version_no ? null : v.version_no)}
              >
                {open === v.version_no ? "Hide lines" : "Show lines"}
                <ChevronDown className={cn("h-3 w-3", open === v.version_no && "rotate-180")} />
              </button>
              {open === v.version_no && (
                <table className="mt-2 w-full text-caption">
                  <tbody>
                    {v.snapshot.items.map((i) => (
                      <tr key={i.product_id}>
                        <td className="py-0.5 pr-2 font-mono">{i.sku}</td>
                        <td className="py-0.5 pr-2">{i.name_en}</td>
                        <td className="py-0.5 pr-2 text-right">{i.quantity} ×</td>
                        <td className="py-0.5 text-right font-mono">{aed(i.unit_price)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} className="pt-1 text-right text-ink-muted">
                        shipping {aed(v.snapshot.shipping_amount)} · discount {aed(v.snapshot.discount_amount)} · VAT {aed(v.snapshot.vat_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

function MessagesCard({
  q,
  canManage,
  closed,
  sending,
  error,
  onSend,
}: {
  q: AdminQuotation;
  canManage: boolean;
  closed: boolean;
  sending: boolean;
  error?: string;
  onSend: (body: { body: string; visibility: "dealer" | "internal"; request_reply: boolean }) => void;
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"dealer" | "internal">(closed ? "internal" : "dealer");
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!sending && !error) {
      setBody("");
      setAsk(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.messages.length]);

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><MessageSquare className="h-4 w-4" />Messages</h2>
      </CardHeader>
      <CardBody>
        {q.messages.length === 0 ? (
          <p className="text-body text-ink-muted">No messages yet.</p>
        ) : (
          <ol className="max-h-[28rem] space-y-3 overflow-y-auto">
            {q.messages.map((m) =>
              m.author_role === "system" ? (
                <li key={m.id} className="text-center text-caption text-ink-muted">
                  {m.body} · {formatDateTime(m.created_at)}
                </li>
              ) : (
                <li
                  key={m.id}
                  className={cn(
                    "rounded-md px-3 py-2 text-body",
                    m.visibility === "internal" ? "border border-dashed border-warning/50 bg-warning/5" : m.author_role === "dealer" ? "bg-app" : "bg-primary/5"
                  )}
                >
                  <p className="text-caption font-semibold text-ink-muted">
                    {m.author_role === "dealer" ? "Dealer" : m.author_name ?? "Staff"}
                    {m.visibility === "internal" && " · internal note"} · {formatDateTime(m.created_at)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-ink">{m.body}</p>
                </li>
              )
            )}
          </ol>
        )}

        {canManage && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <FormField label="Add a message" htmlFor="quote-msg" error={error}>
              <Textarea id="quote-msg" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
            </FormField>
            <Select aria-label="Who sees this message" value={visibility} onChange={(e) => setVisibility(e.target.value as "dealer" | "internal")} disabled={closed}>
              <option value="dealer">Dealer sees it (emailed)</option>
              <option value="internal">Internal note (staff only)</option>
            </Select>
            {visibility === "dealer" && q.status !== "approved" && (
              <Checkbox id="quote-ask" label="Ask the dealer to reply (status becomes Waiting for dealer)" checked={ask} onChange={(e) => setAsk(e.target.checked)} />
            )}
            <div className="flex justify-end">
              <Button size="sm" loading={sending} disabled={!body.trim()} onClick={() => onSend({ body: body.trim(), visibility, request_reply: ask })}>
                {visibility === "internal" ? "Add note" : "Send to dealer"}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ApproveModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  q,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (expiresAt: string | null) => void;
  loading: boolean;
  error?: string;
  q: AdminQuotation;
}) {
  const defaultDate = () => {
    const current = q.expires_at ? new Date(q.expires_at.replace(" ", "T")) : null;
    const d = current && current.getTime() > Date.now() ? current : new Date(Date.now() + q.default_expiry_days * 86400000);
    return d.toISOString().slice(0, 10);
  };
  const [date, setDate] = useState(defaultDate);
  useEffect(() => {
    if (open) setDate(defaultDate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const short = q.items.filter((i) => i.stock && i.stock.track_inventory && i.stock.stock_quantity < i.quantity);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve quotation"
      description={`The dealer is emailed that ${q.quotation_number} (${aed(q.total)}) is ready. They can accept it until the date below; accepting places the order at these prices.`}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={() => onSubmit(date || null)}>Approve and send</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Valid until (end of day)" htmlFor="approve-expiry" error={error} helperText={`Default ${q.default_expiry_days} days (B2B settings).`}>
          <Input id="approve-expiry" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        {short.length > 0 && (
          <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-caption text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            Not enough stock right now for {short.map((i) => i.sku).join(", ")}. The dealer can't accept until stock is back, or you revise the quantity.
          </p>
        )}
      </div>
    </Modal>
  );
}
