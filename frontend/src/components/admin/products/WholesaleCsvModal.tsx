"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import apiClient from "@/lib/api/client";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { showError, showSuccess } from "@/components/admin/ui/toast";

interface ImportResult {
  dry_run: boolean;
  saved: boolean;
  rows: number;
  updated: number;
  unchanged: number;
  skipped_blank: number;
  error_count: number;
  errors: { line: number; sku: string; message: string }[];
  missing_after: number;
}

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg || fallback;
}

/**
 * Wholesale price backfill by CSV (b2b.pricing.manage). Download the sheet, fill in
 * the wholesale_price column, then check it and save. Nothing is saved while any row
 * has an error.
 */
export function WholesaleCsvModal({
  open,
  onClose,
  missingCount,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  missingCount: number;
  onSaved: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<"export" | "check" | "save" | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = async (missingOnly: boolean) => {
    setBusy("export");
    try {
      const res = await apiClient.get("/admin/products/wholesale/export", {
        params: missingOnly ? { missing: 1 } : undefined,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wholesale-prices${missingOnly ? "-missing" : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(errorMessage(err, "Could not download the CSV."));
    } finally {
      setBusy(null);
    }
  };

  const upload = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(dryRun ? "check" : "save");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dry_run", dryRun ? "1" : "0");
      const { data } = await apiClient.post("/admin/products/wholesale/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const r = data.data as ImportResult;
      setResult(r);
      if (r.saved) {
        showSuccess(`Saved ${r.updated} wholesale price(s)`);
        onSaved();
      }
    } catch (err) {
      showError(errorMessage(err, "Could not read the CSV."));
    } finally {
      setBusy(null);
    }
  };

  const canSave = !!result && result.dry_run && result.error_count === 0 && result.updated > 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Wholesale prices (CSV)"
      description="Fill in prices for many products at once, matched by SKU."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => upload(true)} disabled={!file} loading={busy === "check"}>
            Check file
          </Button>
          <Button onClick={() => upload(false)} disabled={!canSave} loading={busy === "save"}>
            Save {result && canSave ? `${result.updated} price(s)` : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-5 text-body">
        <section>
          <h3 className="mb-1 font-semibold text-ink">1. Download</h3>
          <p className="mb-2 text-caption text-ink-muted">
            The sheet has each product&rsquo;s SKU, name and retail price. {missingCount > 0 ? `${missingCount} product(s) still have no wholesale price.` : "Every product has a wholesale price."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => download(true)} loading={busy === "export"} disabled={missingCount === 0}>
              <Download className="h-4 w-4" /> Products missing a price
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(false)} loading={busy === "export"}>
              <Download className="h-4 w-4" /> All products
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-ink">2. Fill in and upload</h3>
          <p className="mb-2 text-caption text-ink-muted">
            Only the <code>sku</code>, <code>wholesale_price</code> and (optional) <code>wholesale_min_qty</code> columns are read. Rows with an empty wholesale price are left as they are. A wholesale price can&rsquo;t be higher than the retail price.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-caption text-ink hover:bg-surface">
            <Upload className="h-4 w-4" />
            {file ? file.name : "Choose a .csv file"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </label>
        </section>

        {result && (
          <section aria-live="polite" className="rounded-md border border-border p-3">
            {result.error_count > 0 ? (
              <>
                <p className="font-semibold text-danger">
                  {result.error_count} row(s) need fixing. Nothing has been saved.
                </p>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-caption">
                  {result.errors.map((e) => (
                    <li key={`${e.line}-${e.sku}`}>
                      <span className="font-mono text-ink-muted">Line {e.line}</span>
                      {e.sku && <span className="font-mono"> {e.sku}</span>}: {e.message}
                    </li>
                  ))}
                </ul>
                {result.error_count > result.errors.length && (
                  <p className="mt-1 text-caption text-ink-muted">…and {result.error_count - result.errors.length} more.</p>
                )}
              </>
            ) : result.saved ? (
              <p className="font-semibold text-success">
                Saved {result.updated} price(s). {result.missing_after > 0 ? `${result.missing_after} product(s) still need a wholesale price.` : "Every product now has a wholesale price."}
              </p>
            ) : (
              <p className="text-ink">
                Ready to save: {result.updated} price(s) will change, {result.unchanged} already match
                {result.skipped_blank > 0 ? `, ${result.skipped_blank} row(s) left blank` : ""}.
                {result.updated === 0 && " There is nothing to save."}
              </p>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
