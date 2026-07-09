import { X } from "lucide-react";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  /** Dropdown filter controls (e.g. a Select) — fully custom, rendered as-is. */
  children?: React.ReactNode;
  chips?: FilterChip[];
  onClearAll?: () => void;
}

/** Toolbar row: custom filter controls plus active-filter chips with a clear-all. */
export function FilterBar({ children, chips = [], onClearAll }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-caption font-semibold text-primary"
        >
          {chip.label}
          <button type="button" onClick={chip.onRemove} aria-label={`Remove ${chip.label} filter`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length > 0 && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-caption font-semibold text-ink-muted hover:text-ink"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
