"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";

interface BulkAddResult {
  created: number[];
  skipped: number[];
}

/**
 * One make+model(+chassis) entered once against a year span creates one `vehicles`
 * row per year — the flow described for e.g. Nissan Altima: run this once for
 * "L32, 2007-2013", then again for "L33, 2013-2018". The overlap year (2013) isn't
 * a conflict because chassis_code is part of the catalog's dedup key.
 */
export function VehicleBulkAddDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [chassisCode, setChassisCode] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  useEffect(() => {
    if (open) {
      setMake("");
      setModel("");
      setChassisCode("");
      setYearFrom("");
      setYearTo("");
    }
  }, [open]);

  const save = useMutation({
    mutationFn: () =>
      adminApi.post<BulkAddResult>("/vehicles/bulk", {
        make,
        model,
        chassis_code: chassisCode || null,
        year_from: Number(yearFrom),
        year_to: Number(yearTo),
      }),
    onSuccess: (result) => {
      const createdCount = result.created.length;
      const skippedCount = result.skipped.length;
      showSuccess(
        `${createdCount} vehicle${createdCount === 1 ? "" : "s"} added` +
          (skippedCount > 0 ? `, ${skippedCount} already existed and were skipped` : "")
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "vehicles", "list"] });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not bulk-add vehicles."),
  });

  const yearsRequested = Number(yearTo) - Number(yearFrom) + 1;
  const canSave =
    make.trim() !== "" &&
    model.trim() !== "" &&
    yearFrom !== "" &&
    yearTo !== "" &&
    yearsRequested >= 1 &&
    yearsRequested <= 60;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Bulk Add Vehicles (Year Range)"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            Add Vehicles
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg border border-border bg-app px-3.5 py-2.5 text-caption text-ink-muted">
          Creates one catalog row per year in the range for this make/model/chassis. Run it once per
          generation — e.g. Nissan Altima L32 for 2007–2013, then again with L33 for 2013–2018. Overlapping
          years across different generations are fine.
        </p>
        <FormField label="Make" htmlFor="bulk-make" required>
          <Input id="bulk-make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Nissan" />
        </FormField>
        <FormField label="Model" htmlFor="bulk-model" required>
          <Input id="bulk-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Altima" />
        </FormField>
        <FormField label="Chassis / Generation" htmlFor="bulk-chassis">
          <Input
            id="bulk-chassis"
            value={chassisCode}
            onChange={(e) => setChassisCode(e.target.value)}
            placeholder="e.g. L32 — leave blank if the model has no distinct generations"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Year From" htmlFor="bulk-year-from" required>
            <Input
              id="bulk-year-from"
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder="2007"
            />
          </FormField>
          <FormField label="Year To" htmlFor="bulk-year-to" required>
            <Input
              id="bulk-year-to"
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder="2013"
            />
          </FormField>
        </div>
        {yearFrom !== "" && yearTo !== "" && yearsRequested > 60 && (
          <p className="text-caption text-danger">Year range is too large — max 60 years at once.</p>
        )}
      </div>
    </Drawer>
  );
}
