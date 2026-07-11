"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
}

/**
 * "..." dropdown used by columns.actions() — View / Edit / Delete, or any custom set.
 * Renders the menu itself through a portal at `fixed` screen coordinates rather than
 * `absolute` inside the row — table rows live inside DataTable's `overflow-x-auto`
 * wrapper, which clips (and effectively hides) an absolutely-positioned dropdown that
 * would otherwise render below/beside that wrapper's visible bounds.
 */
export function ActionsMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    // capture: true — the scrolling ancestor's scroll event doesn't bubble to window.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (actions.length === 0) return null;

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  return (
    <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label="Row actions"
        className="rounded-sm p-1.5 text-ink-muted hover:bg-app"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              style={{ top: position.top, right: position.right }}
              className="fixed z-50 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-md"
            >
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
          </>,
          document.body
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
