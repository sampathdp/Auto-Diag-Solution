"use client";

import { Copy } from "lucide-react";
import toast from "react-hot-toast";
import type { BankTransferDetails as Details } from "@/types/order";

const FIELDS: { key: keyof Details["accounts"][number]; label: string; mono?: boolean }[] = [
  { key: "bank_name", label: "Bank" },
  { key: "account_holder", label: "Account name" },
  { key: "account_number", label: "Account number", mono: true },
  { key: "iban", label: "IBAN", mono: true },
  { key: "swift", label: "SWIFT", mono: true },
  { key: "branch", label: "Branch" },
];

function copy(value: string) {
  navigator.clipboard?.writeText(value).then(
    () => toast.success("Copied"),
    () => toast.error("Couldn't copy")
  );
}

/**
 * The company bank account(s) to transfer to, and the reference to quote. Before the
 * order exists (checkout) the reference is the order number the buyer gets next.
 */
export function BankTransferDetails({ details, amount }: { details: Details; amount?: number }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {amount != null && (
        <p>
          Transfer <span className="font-bold">AED {amount.toLocaleString()}</span> to:
        </p>
      )}
      {details.accounts.map((account, i) => (
        <dl key={i} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border bg-background p-3">
          {FIELDS.filter((f) => account[f.key]).map((f) => (
            <div key={f.key} className="contents">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="flex min-w-0 items-center gap-1.5">
                <span className={f.mono ? "break-all font-mono" : "font-medium"}>{account[f.key]}</span>
                {f.mono && (
                  <button type="button" onClick={() => copy(account[f.key])} aria-label={`Copy ${f.label}`} className="shrink-0 text-muted-foreground hover:text-foreground">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ))}
      <p>
        Reference:{" "}
        {details.reference ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono font-bold">{details.reference}</span>
            <button type="button" onClick={() => copy(details.reference!)} aria-label="Copy reference" className="text-muted-foreground hover:text-foreground">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <span className="font-semibold">your order number (shown after you place the order)</span>
        )}
      </p>
      {details.instructions && <p className="whitespace-pre-line text-muted-foreground">{details.instructions}</p>}
    </div>
  );
}
