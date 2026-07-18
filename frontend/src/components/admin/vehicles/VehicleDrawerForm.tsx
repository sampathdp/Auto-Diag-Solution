"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import type { Vehicle } from "@/mocks/admin/db";

/**
 * Adds or edits a single year/make/model combination — the granularity the real
 * backend supports (POST/PUT /vehicles(/{id}), one row). The mock's old group-level
 * edit-year/edit-make/edit-model modes mapped to a bulk-rename endpoint that has no
 * backend equivalent and were removed rather than half-wired; see ARCHITECTURE.md §8.4.
 */
export function VehicleDrawerForm({
  open,
  onClose,
  vehicle,
}: {
  open: boolean;
  onClose: () => void;
  /** Present = editing; absent = creating. */
  vehicle?: Vehicle | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!vehicle;
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [chassisCode, setChassisCode] = useState("");

  useEffect(() => {
    if (open) {
      setYear(vehicle ? String(vehicle.year) : "");
      setMake(vehicle?.make ?? "");
      setModel(vehicle?.model ?? "");
      setChassisCode(vehicle?.chassis_code ?? "");
    }
  }, [open, vehicle]);

  const save = useMutation({
    mutationFn: () => {
      const payload = { year: Number(year), make, model, chassis_code: chassisCode || null };
      return isEdit && vehicle ? adminApi.put(`/vehicles/${vehicle.id}`, payload) : adminApi.post("/vehicles", payload);
    },
    onSuccess: () => {
      showSuccess(isEdit ? "Vehicle updated" : "Vehicle added");
      queryClient.invalidateQueries({ queryKey: ["admin", "vehicles", "list"] });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Vehicle" : "Add Vehicle"}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => save.mutate()} loading={save.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Year" htmlFor="v-year" required>
          <Input id="v-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
        </FormField>
        <FormField label="Make" htmlFor="v-make" required>
          <Input id="v-make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
        </FormField>
        <FormField label="Model" htmlFor="v-model" required>
          <Input id="v-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry" />
        </FormField>
        <FormField label="Chassis / Generation" htmlFor="v-chassis">
          <Input
            id="v-chassis"
            value={chassisCode}
            onChange={(e) => setChassisCode(e.target.value)}
            placeholder="e.g. L32 — leave blank if the model has no distinct generations"
          />
        </FormField>
      </div>
    </Drawer>
  );
}
