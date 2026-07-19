"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Select } from "@/components/admin/ui/Select";
import { Input } from "@/components/admin/ui/Input";

const CARRIERS = ["Aramex", "DHL", "FedEx", "Local Courier", "Other"];

export function ShipOrderModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { carrier: string; trackingNumber: string }) => void;
  loading?: boolean;
}) {
  const [carrier, setCarrier] = useState("Aramex");
  const [trackingNumber, setTrackingNumber] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ship order?"
      description="No courier API is wired up yet — record who's carrying it and the tracking number so the customer can follow it."
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button
            type="button"
            loading={loading}
            disabled={!trackingNumber.trim()}
            onClick={() => onConfirm({ carrier, trackingNumber: trackingNumber.trim() })}
          >
            Mark as Shipped
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Carrier" htmlFor="ship-carrier" required>
          <Select id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Tracking Number" htmlFor="ship-tracking" required>
          <Input
            id="ship-tracking"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 123456789"
          />
        </FormField>
      </div>
    </Modal>
  );
}
