"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Textarea } from "@/components/admin/ui/Textarea";

export function VerifyVinModal({
  open,
  onClose,
  onConfirm,
  initialNote,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  initialNote?: string | null;
  loading?: boolean;
}) {
  const [note, setNote] = useState(initialNote ?? "");

  useEffect(() => {
    if (open) setNote(initialNote ?? "");
  }, [open, initialNote]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve VIN"
      description="Check the customer's VIN or Mulkiya photo against the ordered parts, then approve to confirm it fits."
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button type="button" variant="primary" loading={loading} onClick={() => onConfirm(note.trim())}>
            Approve VIN
          </Button>
        </>
      }
    >
      <FormField label="Note" htmlFor="verify-vin-note" helperText="Optional — e.g. VIN, model/year checked, who confirmed.">
        <Textarea
          id="verify-vin-note"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Checked Mulkiya on WhatsApp — 2019 Land Cruiser, parts fit."
        />
      </FormField>
    </Modal>
  );
}
