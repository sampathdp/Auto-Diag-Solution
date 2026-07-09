"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
}

/** "..." dropdown used by columns.actions() — View / Edit / Delete, or any custom set. */
export function ActionsMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Row actions"
        className="rounded-sm p-1.5 text-ink-muted hover:bg-app"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-md">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-body hover:bg-app",
                    action.variant === "danger" ? "text-danger" : "text-ink"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function defaultRowActions({
  onView,
  onEdit,
  onDelete,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}): RowAction[] {
  const actions: RowAction[] = [];
  if (onView) actions.push({ label: "View", icon: Eye, onClick: onView });
  if (onEdit) actions.push({ label: "Edit", icon: Pencil, onClick: onEdit });
  if (onDelete) actions.push({ label: "Delete", icon: Trash2, onClick: onDelete, variant: "danger" });
  return actions;
}
