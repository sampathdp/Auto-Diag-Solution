"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Clock, FileText, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/api/client";
import { BankTransferDetails } from "@/components/checkout/BankTransferDetails";
import type { Order } from "@/types/order";

const STATUS_TEXT: Record<string, { text: string; tone: "ok" | "wait" | "bad" }> = {
  paid: { text: "Paid", tone: "ok" },
  pending: { text: "Awaiting payment", tone: "wait" },
  pending_verification: { text: "Awaiting bank transfer verification", tone: "wait" },
  partially_paid: { text: "Partially paid", tone: "wait" },
  failed: { text: "Payment failed", tone: "bad" },
  refunded: { text: "Refunded", tone: "bad" },
};

const METHOD_HINT: Record<string, string> = {
  cod: "Pay in cash when your order is delivered.",
  cheque: "The order is marked paid when your cheque clears.",
};

/**
 * How an order is being paid, and what the buyer still has to do: bank details and a
 * receipt upload while a bank transfer is awaited. `uploadPath` is the API path that
 * accepts the receipt (account order, or the guest tracking link with its token).
 */
export function OrderPaymentPanel({
  order,
  uploadPath,
  onUpdated,
  className = "rounded-xl border bg-card p-6 shadow-sm",
}: {
  order: Order;
  uploadPath: string | null;
  onUpdated: (order: Order) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const status = STATUS_TEXT[order.payment_status ?? ""] ?? null;
  const proofs = order.payment_proofs ?? [];

  const upload = async (file: File) => {
    if (!uploadPath) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The file is too large. Maximum size is 5 MB.");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await apiClient.post(uploadPath, form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Receipt uploaded. We'll verify your payment shortly.");
      if (res.data?.data) onUpdated(res.data.data as Order);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <h2 className="mb-3 text-lg font-bold">Payment</h2>
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">{order.payment_method_label ?? "—"}</p>
        {status && (
          <p
            className={
              status.tone === "ok"
                ? "inline-flex items-center gap-1.5 text-xs font-medium text-success"
                : status.tone === "bad"
                  ? "text-xs font-medium text-destructive"
                  : "inline-flex items-center gap-1.5 text-xs font-medium text-warning"
            }
          >
            {status.tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : status.tone === "wait" ? <Clock className="h-3.5 w-3.5" /> : null}
            {status.text}
          </p>
        )}
        {order.payment_status !== "paid" && order.payment_method && METHOD_HINT[order.payment_method] && (
          <p className="text-xs text-muted-foreground">{METHOD_HINT[order.payment_method]}</p>
        )}
      </div>

      {order.payment_instructions && (
        <div className="mt-4 border-t pt-4">
          <BankTransferDetails details={order.payment_instructions} amount={order.total_amount} />
          <p className="mt-3 text-xs text-muted-foreground">We send your order once the payment is verified.</p>
        </div>
      )}

      {proofs.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 border-t pt-4 text-xs">
          {proofs.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{p.original_name}</span>
              <span className="ms-auto shrink-0">uploaded</span>
            </li>
          ))}
        </ul>
      )}

      {order.can_upload_payment_proof && uploadPath && (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {proofs.length > 0 ? "Upload another receipt" : "Upload transfer receipt"}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">JPG, PNG, WebP or PDF, up to 5 MB. Optional, but it speeds up verification.</p>
        </div>
      )}
    </div>
  );
}
