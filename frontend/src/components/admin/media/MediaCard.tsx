"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaThumbnail } from "./MediaThumbnail";
import type { MediaItem } from "@/mocks/admin/db";

export function MediaCard({
  item,
  selected,
  onToggleSelect,
  onClick,
}: {
  item: MediaItem;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-surface shadow-sm transition-colors",
        selected ? "border-primary" : "border-border"
      )}
    >
      <button type="button" onClick={onClick} className="block h-28 w-full text-left">
        <MediaThumbnail item={item} size="lg" className="rounded-none" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        aria-label={selected ? "Deselect" : "Select"}
        className={cn(
          "absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-white/70 bg-black/20 text-transparent opacity-0 group-hover:opacity-100"
        )}
      >
        <Check className="h-3 w-3" />
      </button>

      {/* Hover overlay with filename/size/dimensions */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-9 px-2 pb-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {item.width && item.height ? `${item.width}×${item.height}` : null}
      </div>

      <div className="p-2.5">
        <p className="truncate text-caption font-medium text-ink">{item.filename}</p>
        <p className="text-[11px] text-ink-muted">{item.size_kb} KB</p>
      </div>
    </div>
  );
}
