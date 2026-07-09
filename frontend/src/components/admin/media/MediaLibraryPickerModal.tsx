"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { cn } from "@/lib/utils";
import { MediaThumbnail } from "./MediaThumbnail";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import type { PaginatedResponse } from "@/types/api";

export function MediaLibraryPickerModal({
  open,
  onClose,
  onConfirm,
  alreadySelectedIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (ids: number[]) => void;
  alreadySelectedIds?: number[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const mediaQuery = useAdminQuery<PaginatedResponse<RawMediaRow>>(
    adminQueryKeys.media.list({ per_page: 100 }),
    "/media",
    { per_page: 100 }
  );

  const images = useMemo(
    () =>
      (mediaQuery.data?.items ?? [])
        .map(toMediaItem)
        .filter((m) => m.type === "image" && m.filename.toLowerCase().includes(search.toLowerCase())),
    [mediaQuery.data, search]
  );

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add from Media Library"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              onConfirm(selected);
              setSelected([]);
            }}
          >
            Add {selected.length > 0 ? `${selected.length} ` : ""}Image{selected.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input
          placeholder="Search media…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
        {images.map((item) => {
          const alreadyAdded = alreadySelectedIds.includes(item.id);
          const isSelected = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={alreadyAdded}
              onClick={() => toggle(item.id)}
              className={cn(
                "group relative overflow-hidden rounded-lg border-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                isSelected ? "border-primary" : "border-transparent hover:border-border"
              )}
            >
              <div className="h-20 w-full">
                <MediaThumbnail item={item} size="lg" className="rounded-none" />
              </div>
              {isSelected && (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <p className="truncate px-1.5 py-1 text-[11px] text-ink-muted">
                {alreadyAdded ? "Already added" : item.filename}
              </p>
            </button>
          );
        })}
        {mediaQuery.isLoading && <p className="col-span-full py-8 text-center text-ink-muted">Loading…</p>}
        {!mediaQuery.isLoading && images.length === 0 && (
          <p className="col-span-full py-8 text-center text-ink-muted">No images match your search.</p>
        )}
      </div>
    </Modal>
  );
}
