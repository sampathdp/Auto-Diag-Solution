"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";

/**
 * Adds a single year/make/model combination — the only vehicle-catalog write the
 * real backend supports (POST /vehicles, one row). The mock's group-level
 * edit-year/edit-make/edit-model modes mapped to a bulk-rename endpoint that has
 * no backend equivalent and were removed rather than half-wired; see
 * ARCHITECTURE.md §8.4.
 */
export function VehicleGroupDrawerForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (open) {
      setYear("");
      setMake("");
      setModel("");
    }
  }, [open]);

  const save = useMutation({
    mutationFn: () => adminApi.post("/vehicles", { year: Number(year), make, model }),
    onSuccess: () => {
      showSuccess("Vehicle added");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.vehicles.list() });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save."),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add Vehicle"
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
      </div>
    </Drawer>
  );
}
