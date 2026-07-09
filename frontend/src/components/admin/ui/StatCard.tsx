import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; positive?: boolean; label?: string };
  /** Plain subtext shown instead of a trend when a day-over-day comparison isn't meaningful. */
  caption?: string;
  tone?: "primary" | "warning";
}

const TONE_CLASSES = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
} as const;

export function StatCard({ label, value, icon: Icon, trend, caption, tone = "primary" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-sm", TONE_CLASSES[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-h2 font-bold text-ink">{value}</p>
      {trend ? (
        <p className={cn("mt-1 text-caption font-medium", trend.positive !== false ? "text-success" : "text-danger")}>
          {trend.positive !== false ? "▲" : "▼"} {Math.abs(trend.value)}% {trend.label ?? "vs yesterday"}
        </p>
      ) : caption ? (
        <p className="mt-1 text-caption text-ink-muted">{caption}</p>
      ) : null}
    </div>
  );
}
