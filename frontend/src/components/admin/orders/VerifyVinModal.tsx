"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";

// Standard 17-char VIN; I, O and Q are never used. Mirrors OrderService::verifyVin.
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function VerifyVinModal({
  open,
  onClose,
  onConfirm,
  initialVin,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (vin: string) => void;
  initialVin?: string | null;
  loading?: boolean;
}) {
  const [vin, setVin] = useState(initialVin ?? "");

  useEffect(() => {
    if (open) setVin(initialVin ?? "");
  }, [open, initialVin]);

  const normalized = vin.replace(/\s+/g, "").toUpperCase();
  const valid = VIN_PATTERN.test(normalized);
  const showError = normalized.length > 0 && !valid;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verify VIN"
      description="Check the customer's VIN or Mulkiya photo against the ordered parts, then enter the VIN to confirm it fits."
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button type="button" variant="primary" loading={loading} disabled={!valid} onClick={() => onConfirm(normalized)}>
            Approve VIN
          </Button>
        </>
      }
    >
      <FormField
        label="VIN"
        htmlFor="verify-vin"
        required
        error={showError ? "17 letters/digits — I, O and Q are not used in VINs" : undefined}
      >
        <Input
          id="verify-vin"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase())}
          maxLength={20}
          placeholder="e.g. JTMHV05J604123456"
          className="font-mono"
          autoFocus
        />
      </FormField>
    </Modal>
  );
}
