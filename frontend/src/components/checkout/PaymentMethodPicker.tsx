"use client";

import { Banknote, Building2, CreditCard, FileCheck2, Landmark, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BankTransferDetails } from "@/components/checkout/BankTransferDetails";
import type { CheckoutPaymentMethods, PaymentMethodCode } from "@/types/order";

const ICONS: Record<PaymentMethodCode, typeof Banknote> = {
  cod: Banknote,
  bank_transfer: Landmark,
  cheque: FileCheck2,
  credit: Building2,
  online_card: CreditCard,
};

/**
 * Payment method tiles. The list comes from the server (PaymentMethodPolicy), which
 * checks the choice again when the order is placed; unavailable methods (card payment,
 * dealer credit for now) are shown greyed out with their reason.
 */
export function PaymentMethodPicker({
  data,
  loading,
  value,
  onChange,
  total,
}: {
  data: CheckoutPaymentMethods | undefined;
  loading: boolean;
  value: PaymentMethodCode | null;
  onChange: (code: PaymentMethodCode) => void;
  total: number;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data || data.methods.length === 0) {
    return <p className="text-sm text-destructive">No payment methods are available right now. Please contact us to place your order.</p>;
  }

  return (
    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Payment method">
      {data.methods.map((m) => {
        const Icon = ICONS[m.code] ?? CreditCard;
        const selected = value === m.code;
        return (
          <div key={m.code}>
            <label
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-sm transition-colors",
                !m.available && "cursor-not-allowed opacity-60",
                m.available && "cursor-pointer",
                selected ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : m.available && "hover:bg-secondary/50"
              )}
            >
              <input
                type="radio"
                name="payment_method"
                value={m.code}
                checked={selected}
                disabled={!m.available}
                onChange={() => onChange(m.code)}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
              />
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                  {m.label}
                  {!m.available && m.reason && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {m.reason === "Coming soon" ? "Coming soon" : "Unavailable"}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {!m.available && m.reason && m.reason !== "Coming soon" ? m.reason : m.description}
                </p>
              </div>
            </label>
            {selected && m.code === "bank_transfer" && data.bank_transfer && (
              <div className="mt-2 rounded-lg border border-dashed p-4">
                <BankTransferDetails details={data.bank_transfer} amount={total} />
                <p className="mt-3 text-xs text-muted-foreground">
                  After placing the order you can upload the transfer receipt. We send your order once the payment is verified.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
