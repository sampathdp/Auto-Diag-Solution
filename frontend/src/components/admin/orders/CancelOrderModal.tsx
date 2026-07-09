"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Textarea } from "@/components/admin/ui/Textarea";

export function CancelOrderModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel order?"
      description="This stops fulfillment and notifies inventory. Provide a reason for the record."
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={loading}
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            Cancel Order
          </Button>
        </>
      }
    >
      <FormField label="Reason" htmlFor="cancel-reason" required>
        <Textarea
          id="cancel-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer requested cancellation, item out of stock…"
        />
      </FormField>
    </Modal>
  );
}
