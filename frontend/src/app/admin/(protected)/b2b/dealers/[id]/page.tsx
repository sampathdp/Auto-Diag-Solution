"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, UserRound, MapPin, FileText, Lock, Eye, Wallet, History, ExternalLink, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Switch } from "@/components/admin/ui/Switch";
import { NotesPanel } from "@/components/admin/NotesPanel";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { ApproveDealerModal, CreditTermsModal, ReasonModal, type FieldErrors } from "@/components/admin/b2b/DealerActionModals";
import { PrivateDocumentViewer } from "@/components/admin/b2b/PrivateDocumentViewer";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDateTime, formatDate } from "@/lib/admin/utils";
import { hasPermission } from "@/lib/admin/permissions";
import { useAuthStore } from "@/store/useAuthStore";
import {
  BUSINESS_TYPE_LABEL,
  DEALER_STATUS_LABEL,
  DOC_TYPE_LABEL,
  type AdminDealerDetail,
  type DealerDocumentMeta,
  type DealerStatus,
} from "@/types/dealer";

type Dialog = null | "approve" | "reject" | "info" | "suspend" | "credit";

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-1.5">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className={`break-words text-body text-ink ${mono ? "font-mono" : ""}`}>{children ?? "—"}</dd>
    </div>
  );
}

export default function AdminDealerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.permissions);
  const can = (p: string) => hasPermission(permissions, p);

  const query = useAdminQuery<AdminDealerDetail>(adminQueryKeys.b2bDealers.detail(id), `/b2b/dealers/${id}`);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [viewing, setViewing] = useState<DealerDocumentMeta | null>(null);

  const refresh = (data?: AdminDealerDetail) => {
    if (data) queryClient.setQueryData(adminQueryKeys.b2bDealers.detail(id), data);
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.b2bDealers.all });
  };

  const action = useMutation({
    mutationFn: ({ path, body, method }: { path: string; body?: unknown; method?: "post" | "put" }) =>
      method === "put" ? adminApi.put<AdminDealerDetail>(`/b2b/dealers/${id}/${path}`, body) : adminApi.post<AdminDealerDetail>(`/b2b/dealers/${id}/${path}`, body),
    onSuccess: (data, vars) => {
      const messages: Record<string, string> = {
        "start-review": "Review started",
        approve: "Dealer approved. They've been emailed their dealer code.",
        reject: "Application rejected. The dealer has been emailed.",
        "request-info": "The dealer has been asked for more information.",
        suspend: "Dealer suspended",
        reactivate: "Dealer reactivated",
        credit: "Credit terms saved",
        "quotation-rule": "Quotation rule saved",
      };
      showSuccess(messages[vars.path] ?? "Saved");
      setDialog(null);
      setFieldErrors({});
      refresh(data);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details && typeof err.details === "object") {
        setFieldErrors(err.details as FieldErrors);
      }
      showError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  const addNote = useMutation({
    mutationFn: (note: string) => adminApi.post(`/b2b/dealers/${id}/notes`, { note }),
    onSuccess: () => {
      showSuccess("Note added");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.b2bDealers.detail(id) });
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not add the note."),
  });

  if (query.isLoading) return <FullScreenLoader label="Loading dealer…" />;
  if (!query.data) {
    return (
      <div className="py-20 text-center text-body text-ink-muted">
        This dealer application could not be found. <Link href="/admin/b2b/applications" className="text-primary underline">Back to applications</Link>
      </div>
    );
  }

  const { profile: p, user, documents, history, notes, credit } = query.data;
  const status = p.status as DealerStatus;
  const isOpen = status === "pending_review" || status === "under_review";
  const isDealer = status === "approved" || status === "suspended";
  const canReview = can("b2b.applications.review");
  const canSuspend = can("b2b.dealers.suspend");
  const canCredit = can("b2b.credit.manage");
  const open = (d: Dialog) => {
    setFieldErrors({});
    setDialog(d);
  };

  const backHref = isDealer ? "/admin/b2b/dealers" : "/admin/b2b/applications";
  const mapLink = p.map_url || (p.latitude && p.longitude ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : null);
  const creditCurrent = {
    credit_enabled: Number(credit?.credit_enabled ?? 0) === 1,
    credit_limit: credit?.credit_limit ?? "",
    credit_period_days: Number(credit?.credit_period_days ?? query.data.defaults.credit_period_days),
    payment_terms: credit?.payment_terms ?? null,
  };

  return (
    <div>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-body text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        {isDealer ? "Approved dealers" : "Dealer applications"}
      </Link>

      <PageHeader
        title={p.business_name ?? "Unnamed business"}
        description={[p.dealer_code, DEALER_STATUS_LABEL[status], p.submitted_at ? `submitted ${formatDateTime(p.submitted_at)}` : null].filter(Boolean).join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2">
            {status === "pending_review" && canReview && (
              <Button variant="secondary" loading={action.isPending && action.variables?.path === "start-review"} onClick={() => action.mutate({ path: "start-review" })}>
                Start review
              </Button>
            )}
            {isOpen && canReview && (
              <>
                <Button variant="secondary" onClick={() => open("info")}>Ask for more info</Button>
                <Button variant="danger" onClick={() => open("reject")}>Reject</Button>
                <Button onClick={() => open("approve")}>Approve</Button>
              </>
            )}
            {isDealer && canCredit && (
              <Button variant="secondary" onClick={() => open("credit")}>Edit credit terms</Button>
            )}
            {status === "approved" && canSuspend && (
              <Button variant="danger" onClick={() => open("suspend")}>Suspend</Button>
            )}
            {status === "suspended" && canSuspend && (
              <Button loading={action.isPending && action.variables?.path === "reactivate"} onClick={() => action.mutate({ path: "reactivate" })}>
                Reactivate
              </Button>
            )}
          </div>
        }
      />

      {(status === "rejected" || status === "suspended" || (status === "draft" && p.info_request_message)) && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-body text-ink">
          <p className="font-semibold">
            {status === "rejected"
              ? `Rejected${Number(p.allow_resubmission) === 1 ? " (dealer may resubmit)" : " (closed)"}`
              : status === "suspended"
                ? "Suspended"
                : "Waiting for the dealer to send more information"}
          </p>
          <p className="mt-1 whitespace-pre-line">{status === "rejected" ? p.rejection_reason : status === "suspended" ? p.suspension_reason : p.info_request_message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><Building2 className="h-4 w-4" />Business</h2>
            </CardHeader>
            <CardBody>
              <dl>
                <Row label="Registered name">{p.business_name}</Row>
                <Row label="Type">{p.business_type ? BUSINESS_TYPE_LABEL[p.business_type] ?? p.business_type : null}</Row>
                <Row label="Trade licence" mono>{p.trade_licence_number}</Row>
                <Row label="Licence expiry">{p.trade_licence_expiry ? formatDate(p.trade_licence_expiry) : null}</Row>
                <Row label="TRN" mono>{p.trn ?? "Not VAT-registered"}</Row>
                <Row label="Email">{p.business_email}</Row>
                <Row label="Phone" mono>{p.business_phone}</Row>
                <Row label="WhatsApp" mono>{p.whatsapp_number}</Row>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><UserRound className="h-4 w-4" />Owner / authorised person</h2>
            </CardHeader>
            <CardBody>
              <dl>
                <Row label="Full name">{p.owner_name}</Row>
                <Row label="ID document">{p.owner_id_type === "driving_licence" ? "UAE driving licence" : p.owner_id_type === "emirates_id" ? "Emirates ID" : null}</Row>
                <Row label="ID number" mono>
                  {p.owner_id_number ?? (
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                      <Lock className="h-3.5 w-3.5" />
                      {p.owner_id_number_masked ?? "—"}
                    </span>
                  )}
                </Row>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><MapPin className="h-4 w-4" />Location</h2>
            </CardHeader>
            <CardBody>
              <dl>
                <Row label="Address">{p.address_line}</Row>
                <Row label="Area / city">{[p.area, p.city].filter(Boolean).join(", ") || null}</Row>
                <Row label="Emirate">{p.emirate}</Row>
                <Row label="P.O. Box" mono>{p.po_box}</Row>
                <Row label="Map">
                  {mapLink ? (
                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Open in Google Maps <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </Row>
                {p.notes && <Row label="Dealer's notes"><span className="whitespace-pre-line">{p.notes}</span></Row>}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><FileText className="h-4 w-4" />Documents</h2>
            </CardHeader>
            <CardBody>
              {!query.data.can_view_documents && (
                <p className="mb-3 flex items-center gap-2 text-caption text-ink-muted">
                  <Lock className="h-3.5 w-3.5" />
                  You need the "View dealer identity and licence documents" permission to open these.
                </p>
              )}
              {documents.length === 0 ? (
                <p className="text-body text-ink-muted">No documents uploaded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-body font-medium text-ink">{DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type}</p>
                        <p className="truncate text-caption text-ink-muted">
                          {d.original_name} · {(d.size_bytes / 1024).toFixed(0)} KB{d.created_at ? ` · ${formatDateTime(d.created_at)}` : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" disabled={!query.data.can_view_documents} onClick={() => setViewing(d)}>
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <NotesPanel notes={notes as any} onAdd={(text) => addNote.mutate(text)} adding={addNote.isPending} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-h4 font-bold text-ink">Account</h2>
            </CardHeader>
            <CardBody>
              <dl>
                <Row label="Status"><StatusBadge status={status} /></Row>
                <Row label="Dealer code" mono>{p.dealer_code}</Row>
                <Row label="Signed up as">{user ? `${user.name} (${user.email})` : null}</Row>
                <Row label="Wholesale">{isDealer ? (Number(p.wholesale_enabled) === 1 ? "Yes" : "No") : null}</Row>
                <Row label="Active from">{p.activated_at ? formatDateTime(p.activated_at) : null}</Row>
                <Row label="Expires">{p.expires_at ? formatDateTime(p.expires_at) : isDealer ? "Never" : null}</Row>
                <Row label="Reviewed by">{query.data.reviewer?.name ?? null}</Row>
              </dl>
            </CardBody>
          </Card>

          {isDealer && (
            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><Wallet className="h-4 w-4" />Credit</h2>
              </CardHeader>
              <CardBody>
                <dl>
                  <Row label="Facility">{creditCurrent.credit_enabled ? "On" : "Pay per order"}</Row>
                  {creditCurrent.credit_enabled && (
                    <>
                      <Row label="Limit" mono>AED {Number(creditCurrent.credit_limit).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</Row>
                      <Row label="Period">{creditCurrent.credit_period_days} days after delivery</Row>
                    </>
                  )}
                  <Row label="Terms note">{creditCurrent.payment_terms}</Row>
                  <Row label="Outstanding" mono>AED {Number(credit?.outstanding_balance ?? 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</Row>
                </dl>
              </CardBody>
            </Card>
          )}

          {isDealer && (
            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><FileSpreadsheet className="h-4 w-4" />Quotations</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-body text-ink">
                  {query.data.needs_quotation
                    ? "Their next checkout is sent as a quotation request."
                    : "Their checkout places orders directly."}
                </p>
                <dl>
                  <Row label="First order">
                    {p.first_order_completed_at ? `done ${formatDateTime(p.first_order_completed_at)}` : Number(p.requires_quotation) === 1 ? "needs a quotation" : "no quotation required"}
                  </Row>
                  <Row label="In progress">
                    {["submitted", "under_review", "discussion_required", "revised", "approved"].reduce((n, st) => n + (query.data.quotation_counts?.[st] ?? 0), 0)}
                  </Row>
                  <Row label="Converted">{query.data.quotation_counts?.converted ?? 0}</Row>
                </dl>
                <Switch
                  id="force-quotation"
                  label="Always require a quotation for this dealer"
                  checked={Number(p.force_quotation) === 1}
                  disabled={!canReview || action.isPending}
                  onChange={(e) => action.mutate({ path: "quotation-rule", body: { force_quotation: e.target.checked }, method: "put" })}
                />
                <Link href={`/admin/b2b/quotations?dealer_id=${p.id}`} className="inline-block text-body text-primary hover:underline">
                  See this dealer's quotations
                </Link>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-h4 font-bold text-ink"><History className="h-4 w-4" />History</h2>
            </CardHeader>
            <CardBody>
              <ol className="space-y-4">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-border pl-3">
                    <p className="text-body font-medium text-ink">
                      {h.from_status ? `${DEALER_STATUS_LABEL[h.from_status as DealerStatus] ?? h.from_status} → ` : ""}
                      {DEALER_STATUS_LABEL[h.to_status as DealerStatus] ?? h.to_status}
                    </p>
                    {h.reason && <p className="mt-0.5 whitespace-pre-line text-caption text-ink">{h.reason}</p>}
                    <p className="mt-0.5 text-caption text-ink-muted">
                      {formatDateTime(h.created_at)}
                      {h.changed_by_name ? ` · ${h.changed_by_name}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <ApproveDealerModal
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        errors={fieldErrors}
        suggestedCode={query.data.suggested_dealer_code}
        defaults={query.data.defaults}
        canManageCredit={canCredit}
        onSubmit={(body) => action.mutate({ path: "approve", body })}
      />
      <CreditTermsModal
        open={dialog === "credit"}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        errors={fieldErrors}
        current={creditCurrent}
        onSubmit={(body) => action.mutate({ path: "credit", body, method: "put" })}
      />
      <ReasonModal
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        error={fieldErrors.reason?.[0]}
        title="Reject application"
        description="The dealer is emailed the reason."
        label="Reason"
        confirmLabel="Reject application"
        danger
        withResubmission
        onSubmit={(reason, allow) => action.mutate({ path: "reject", body: { reason, allow_resubmission: allow } })}
      />
      <ReasonModal
        open={dialog === "info"}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        error={fieldErrors.message?.[0]}
        title="Ask for more information"
        description="The application goes back to the dealer to complete. They're emailed your message."
        label="What do you need from the dealer?"
        confirmLabel="Send request"
        onSubmit={(message) => action.mutate({ path: "request-info", body: { message } })}
      />
      <ReasonModal
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        loading={action.isPending}
        error={fieldErrors.reason?.[0]}
        title="Suspend dealer"
        description="The dealer loses dealer prices and dealer checkout immediately, and is emailed the reason."
        label="Reason"
        confirmLabel="Suspend dealer"
        danger
        onSubmit={(reason) => action.mutate({ path: "suspend", body: { reason } })}
      />
      <PrivateDocumentViewer doc={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
