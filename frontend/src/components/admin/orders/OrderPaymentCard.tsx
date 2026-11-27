"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, FileText } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { Modal } from "@/components/admin/ui/Modal";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { PrivateFileViewer, type PrivateFile } from "@/components/admin/b2b/PrivateDocumentViewer";
import { showSuccess } from "@/components/admin/ui/toast";
import { adminApi } from "@/lib/admin/api-client";
import { formatAED, formatDateTime } from "@/lib/admin/utils";
import { hasPermission, PERMISSIONS } from "@/lib/admin/permissions";
import { useAuthStore } from "@/store/useAuthStore";
import type { Order, OrderPaymentProof } from "@/mocks/admin/db";

/** What confirming means for each offline method, and what the reference field holds. */
const CONFIRM_COPY: Record<string, { action: string; title: string; description: string; refLabel: string; refHelp: string; refRequired: boolean }> = {
  cod: {
    action: "Mark COD collected",
    title: "Mark cash on delivery collected",
    description: "Confirm the courier or driver has handed over the cash for this order.",
    refLabel: "Receipt number",
    refHelp: "Optional, e.g. the courier's COD remittance reference.",
    refRequired: false,
  },
  bank_transfer: {
    action: "Verify bank transfer",
    title: "Verify bank transfer",
    description: "Check the money has arrived in the bank account (not just the customer's receipt), then confirm.",
    refLabel: "Bank transaction reference",
    refHelp: "From your bank statement. Each reference can only be used once.",
    refRequired: true,
  },
  cheque: {
    action: "Mark cheque cleared",
    title: "Mark cheque cleared",
    description: "Confirm the cheque has cleared in the bank account.",
    refLabel: "Cheque number",
    refHelp: "Required.",
    refRequired: true,
  },
};

const UNPAID = ["pending", "pending_verification"];
const CLOSED = ["cancelled", "refunded"];

export function OrderPaymentCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const canConfirm = hasPermission(useAuthStore((s) => s.permissions), PERMISSIONS.PAYMENTS_CONFIRM);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewing, setViewing] = useState<PrivateFile | null>(null);

  const method = order.payment_method ?? "";
  const copy = CONFIRM_COPY[method];
  const awaiting = !!copy && UNPAID.includes(order.payment_status) && !CLOSED.includes(order.status);
  const proofs = order.payment_proofs ?? [];
  const transactions = order.payment_transactions ?? [];

  const confirm = useMutation({
    mutationFn: (payload: { reference: string; note: string }) => adminApi.post(`/orders/${order.id}/confirm-payment`, payload),
    onSuccess: () => {
      showSuccess("Payment confirmed");
      setConfirmOpen(false);
      onChanged();
    },
  });

  const openProof = (p: OrderPaymentProof) =>
    setViewing({
      path: `/admin/orders/${order.id}/payment-proofs/${p.id}`,
      title: "Bank transfer receipt",
      originalName: p.original_name,
      mimeType: p.mime_type,
    });

  return (
    <Card>
      <CardHeader className="py-3">
        <h2 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Payment</h2>
      </CardHeader>
      <CardBody className="space-y-2">
        <p className="flex items-center gap-2 text-body font-medium text-ink">
          <CreditCard className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
          {order.payment_method_label ?? method}
        </p>
        {order.payment_reference && (
          <p className="truncate text-caption text-ink-muted">
            Reference: <span className="font-mono text-ink">{order.payment_reference}</span>
          </p>
        )}
        <p className="text-body text-ink-muted">Amount: {formatAED(order.total)}</p>
        <StatusBadge status={order.refund_requested_at ? "refund_requested" : order.payment_status} />

        {proofs.length > 0 && (
          <div className="space-y-1 border-t border-border pt-2">
            <p className="text-caption font-semibold text-ink-muted">Customer receipts</p>
            {proofs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openProof(p)}
                disabled={!canConfirm}
                title={canConfirm ? undefined : "Needs the Confirm order payments permission"}
                className="flex w-full items-center gap-2 text-start text-caption text-primary hover:underline disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{p.original_name}</span>
                <span className="ms-auto shrink-0 text-ink-muted">{formatDateTime(p.created_at)}</span>
              </button>
            ))}
          </div>
        )}
        {method === "bank_transfer" && awaiting && proofs.length === 0 && (
          <p className="border-t border-border pt-2 text-caption text-ink-muted">No receipt uploaded yet. The order can't go to the 3PL until the transfer is verified.</p>
        )}

        {transactions.length > 0 && (
          <div className="space-y-1 border-t border-border pt-2">
            {transactions.map((t) => (
              <p key={t.id} className="flex items-center gap-1.5 text-caption text-ink">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                <span className="truncate">
                  {formatAED(t.amount)} · <span className="font-mono">{t.provider_reference}</span>
                </span>
                <span className="ms-auto shrink-0 text-ink-muted">{formatDateTime(t.created_at)}</span>
              </p>
            ))}
          </div>
        )}

        {awaiting && canConfirm && (
          <Button variant="primary" size="sm" className="mt-1 w-full print:hidden" onClick={() => setConfirmOpen(true)}>
            {copy.action}
          </Button>
        )}
      </CardBody>

      {copy && (
        <ConfirmPaymentModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          copy={copy}
          amount={order.total}
          loading={confirm.isPending}
          onConfirm={(reference, note) => confirm.mutate({ reference, note })}
        />
      )}
      <PrivateFileViewer
        file={viewing}
        onClose={() => setViewing(null)}
        forbiddenMessage="You need the Confirm order payments permission to view receipts."
      />
    </Card>
  );
}

function ConfirmPaymentModal({
  open,
  onClose,
  onConfirm,
  copy,
  amount,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reference: string, note: string) => void;
  copy: (typeof CONFIRM_COPY)[string];
  amount: number;
  loading?: boolean;
}) {
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setReference("");
      setNote("");
    }
  }, [open]);

  const missingRef = copy.refRequired && reference.trim() === "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      description={`${copy.description} Amount: ${formatAED(amount)}.`}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button type="button" variant="primary" loading={loading} disabled={missingRef} onClick={() => onConfirm(reference.trim(), note.trim())}>
            Confirm payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={copy.refLabel} htmlFor="confirm-payment-ref" helperText={copy.refHelp} required={copy.refRequired}>
          <Input id="confirm-payment-ref" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormField>
        <FormField label="Note" htmlFor="confirm-payment-note" helperText="Optional. Saved on the order timeline.">
          <Textarea id="confirm-payment-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}
