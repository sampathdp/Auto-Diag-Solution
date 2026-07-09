"use client";

import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Input } from "@/components/admin/ui/Input";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: string;
  to: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function preset(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: iso(from), to: iso(to) };
}

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Today", range: () => ({ from: iso(new Date()), to: iso(new Date()) }) },
  { label: "7d", range: () => preset(6) },
  { label: "30d", range: () => preset(29) },
  { label: "This month", range: () => ({ from: iso(startOfMonth(new Date())), to: iso(new Date()) }) },
  {
    label: "Last month",
    range: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: iso(startOfMonth(lastMonth)), to: iso(endOfMonth(lastMonth)) };
    },
  },
];

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const matchingPreset = PRESETS.find((p) => {
    const r = p.range();
    return r.from === value.from && r.to === value.to;
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onChange(p.range())}
          className={cn(
            "rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors",
            matchingPreset?.label === p.label
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-ink-muted hover:text-ink"
          )}
        >
          {p.label}
        </button>
      ))}
      <Input type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} className="w-40" />
      <span className="text-caption text-ink-muted">to</span>
      <Input type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} className="w-40" />
    </div>
  );
}
