"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { cn } from "@/lib/utils";

type VehicleCatalogRow = { id: number; year: number; make: string; model: string; chassis_code: string | null };

export type FitmentGroup = {
  make: string;
  model: string;
  chassis_code: string | null;
  year_from: number;
  year_to: number;
};

/** Existing catalog rows are one per exact year (e.g. bulk-added 2015-2020 Camry creates 6 rows) —
 * grouped here by make+model+chassis so picking one entry adds a single ranged fitment row
 * (year_from-year_to) instead of one row per year. */
function groupVehicles(vehicles: VehicleCatalogRow[]): FitmentGroup[] {
  const map = new Map<string, FitmentGroup>();
  for (const v of vehicles) {
    const key = `${v.make.toLowerCase()}|${v.model.toLowerCase()}|${(v.chassis_code ?? "").toLowerCase()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { make: v.make, model: v.model, chassis_code: v.chassis_code, year_from: v.year, year_to: v.year });
    } else {
      existing.year_from = Math.min(existing.year_from, v.year);
      existing.year_to = Math.max(existing.year_to, v.year);
    }
  }
  return [...map.values()].sort(
    (a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || (a.chassis_code ?? "").localeCompare(b.chassis_code ?? "")
  );
}

export function FitmentVehiclePickerModal({
  open,
  onClose,
  onConfirm,
  vehicles,
  existingFitments,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (groups: FitmentGroup[]) => void;
  vehicles: VehicleCatalogRow[];
  existingFitments: { make: string; model: string; chassis_code?: string | null }[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const groups = useMemo(() => groupVehicles(vehicles), [vehicles]);

  const existingKeys = useMemo(
    () =>
      new Set(
        existingFitments.map((f) => `${f.make.trim().toLowerCase()}|${f.model.trim().toLowerCase()}|${(f.chassis_code ?? "").trim().toLowerCase()}`)
      ),
    [existingFitments]
  );

  const groupKey = (g: FitmentGroup) => `${g.make.toLowerCase()}|${g.model.toLowerCase()}|${(g.chassis_code ?? "").toLowerCase()}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => `${g.make} ${g.model} ${g.chassis_code ?? ""}`.toLowerCase().includes(q));
  }, [groups, search]);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const close = () => {
    setSelected([]);
    setSearch("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Fitment from Vehicle Catalog"
      description="Pick vehicles already in your catalog — each selection adds one fitment row covering its full year range."
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              const toAdd = groups.filter((g) => selected.includes(groupKey(g)));
              onConfirm(toAdd);
              close();
            }}
          >
            Add {selected.length > 0 ? `${selected.length} ` : ""}Fitment{selected.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input
          placeholder="Search make, model, or chassis…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-96 space-y-1 overflow-y-auto">
        {filtered.map((g) => {
          const key = groupKey(g);
          const alreadyAdded = existingKeys.has(key);
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              disabled={alreadyAdded}
              onClick={() => toggle(key)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-app"
              )}
            >
              <span className="text-body text-ink">
                <span className="font-semibold">
                  {g.make} {g.model}
                </span>
                {g.chassis_code && <span className="text-ink-muted"> ({g.chassis_code})</span>}
                <span className="text-ink-muted"> — {g.year_from === g.year_to ? g.year_from : `${g.year_from}–${g.year_to}`}</span>
              </span>
              {alreadyAdded ? (
                <span className="text-caption text-ink-muted">Already added</span>
              ) : (
                isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )
              )}
            </button>
          );
        })}
        {vehicles.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-ink-muted">No vehicles match your search.</p>
        )}
        {vehicles.length === 0 && (
          <p className="py-8 text-center text-ink-muted">
            No vehicles in the catalog yet — add some on the Vehicles page first.
          </p>
        )}
      </div>
    </Modal>
  );
}
