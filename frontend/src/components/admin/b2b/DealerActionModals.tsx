"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Switch } from "@/components/admin/ui/Switch";
import { Checkbox } from "@/components/admin/ui/Checkbox";
import { FormField } from "@/components/admin/ui/FormField";

export type FieldErrors = Record<string, string[] | undefined>;

const firstError = (errors: FieldErrors, key: string) => errors[key]?.[0];

/** Approve: dealer code, wholesale access, credit terms, activation window. */
export function ApproveDealerModal({
  open,
  onClose,
  onSubmit,
  loading,
  errors,
  suggestedCode,
  defaults,
  canManageCredit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
  loading: boolean;
  errors: FieldErrors;
  suggestedCode: string;
  defaults: { credit_enabled: boolean; credit_period_days: number };
  canManageCredit: boolean;
}) {
  const [code, setCode] = useState(suggestedCode);
  const [wholesale, setWholesale] = useState(true);
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [limit, setLimit] = useState("");
  const [days, setDays] = useState(String(defaults.credit_period_days || 30));
  const [terms, setTerms] = useState("");
  const [activatedAt, setActivatedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (open) {
      setCode(suggestedCode);
      setWholesale(true);
      setCreditEnabled(canManageCredit && defaults.credit_enabled);
      setLimit("");
      setDays(String(defaults.credit_period_days || 30));
      setTerms("");
      setActivatedAt("");
      setExpiresAt("");
    }
  }, [open, suggestedCode, defaults, canManageCredit]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve dealer"
      description="The dealer gets an email with their code, payment terms and how to sign in."
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() =>
              onSubmit({
                dealer_code: code,
                wholesale_enabled: wholesale,
                credit_enabled: creditEnabled,
                credit_limit: limit,
                credit_period_days: days,
                payment_terms: terms,
                activated_at: activatedAt || undefined,
                expires_at: expiresAt || undefined,
              })
            }
          >
            Approve dealer
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Dealer code" htmlFor="ap-code" required error={firstError(errors, "dealer_code")} helperText="Unique. Letters, numbers and dashes.">
          <Input id="ap-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
        </FormField>
        <div className="flex items-end pb-2">
          <Switch id="ap-wholesale" label="Can buy at wholesale prices" checked={wholesale} onChange={(e) => setWholesale(e.target.checked)} />
        </div>

        <div className="sm:col-span-2 rounded-lg border border-border p-4">
          <Switch
            id="ap-credit"
            label="Give a credit facility"
            checked={creditEnabled}
            disabled={!canManageCredit}
            onChange={(e) => setCreditEnabled(e.target.checked)}
          />
          {!canManageCredit && (
            <p className="mt-2 text-caption text-ink-muted">You need the "Change dealer credit limits and terms" permission to give credit. The dealer will pay per order.</p>
          )}
          {creditEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField label="Credit limit (AED)" htmlFor="ap-limit" required error={firstError(errors, "credit_limit")}>
                <Input id="ap-limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="500000" />
              </FormField>
              <FormField label="Credit period (days after delivery)" htmlFor="ap-days" required error={firstError(errors, "credit_period_days")}>
                <Input id="ap-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
              </FormField>
            </div>
          )}
          <FormField className="mt-4" label="Payment terms note (shown to the dealer)" htmlFor="ap-terms" error={firstError(errors, "payment_terms")}>
            <Input id="ap-terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. Cheques dated within 30 days" />
          </FormField>
        </div>

        <FormField label="Active from" htmlFor="ap-from" error={firstError(errors, "activated_at")} helperText="Leave empty to activate now.">
          <Input id="ap-from" type="date" value={activatedAt} onChange={(e) => setActivatedAt(e.target.value)} />
        </FormField>
        <FormField label="Expires on" htmlFor="ap-to" error={firstError(errors, "expires_at")} helperText="Optional.">
          <Input id="ap-to" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

/** Edit credit terms of an approved dealer. */
export function CreditTermsModal({
  open,
  onClose,
  onSubmit,
  loading,
  errors,
  current,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
  loading: boolean;
  errors: FieldErrors;
  current: { credit_enabled: boolean; credit_limit: string; credit_period_days: number; payment_terms: string | null };
}) {
  const [enabled, setEnabled] = useState(current.credit_enabled);
  const [limit, setLimit] = useState(current.credit_limit);
  const [days, setDays] = useState(String(current.credit_period_days || 30));
  const [terms, setTerms] = useState(current.payment_terms ?? "");

  useEffect(() => {
    if (open) {
      setEnabled(current.credit_enabled);
      setLimit(Number(current.credit_limit) > 0 ? current.credit_limit : "");
      setDays(String(current.credit_period_days || 30));
      setTerms(current.payment_terms ?? "");
    }
  }, [open, current]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Credit terms"
      description="Changes apply to new orders. The change is recorded in the audit log."
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={() => onSubmit({ credit_enabled: enabled, credit_limit: limit, credit_period_days: days, payment_terms: terms })}>
            Save credit terms
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Switch id="ct-enabled" label="Credit facility on" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Credit limit (AED)" htmlFor="ct-limit" required error={firstError(errors, "credit_limit")}>
              <Input id="ct-limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
            </FormField>
            <FormField label="Credit period (days after delivery)" htmlFor="ct-days" required error={firstError(errors, "credit_period_days")}>
              <Input id="ct-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
            </FormField>
          </div>
        )}
        <FormField label="Payment terms note" htmlFor="ct-terms" error={firstError(errors, "payment_terms")}>
          <Input id="ct-terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

/** Single text reason: reject, request info, suspend. */
export function ReasonModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  title,
  description,
  label,
  confirmLabel,
  danger,
  withResubmission,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string, allowResubmission: boolean) => void;
  loading: boolean;
  error?: string;
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  danger?: boolean;
  withResubmission?: boolean;
}) {
  const [text, setText] = useState("");
  const [allow, setAllow] = useState(true);

  useEffect(() => {
    if (open) {
      setText("");
      setAllow(true);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} disabled={text.trim().length < 5} onClick={() => onSubmit(text, allow)}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label={label} htmlFor="reason-text" required error={error} helperText="The dealer sees this in their email.">
          <Textarea id="reason-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </FormField>
        {withResubmission && (
          <Checkbox id="reason-resubmit" label="Let the dealer fix the application and send it again" checked={allow} onChange={(e) => setAllow(e.target.checked)} />
        )}
      </div>
    </Modal>
  );
}
