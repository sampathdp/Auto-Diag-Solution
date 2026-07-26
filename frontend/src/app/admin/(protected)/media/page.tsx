"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Input } from "@/components/admin/ui/Input";
import { Select } from "@/components/admin/ui/Select";
import { Button } from "@/components/admin/ui/Button";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { MediaCard } from "@/components/admin/media/MediaCard";
import { MediaUploadDropzone } from "@/components/admin/media/MediaUploadDropzone";
import { MediaDetailDrawer } from "@/components/admin/media/MediaDetailDrawer";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { useDataTable } from "@/lib/admin/hooks/useDataTable";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import type { PaginatedResponse } from "@/types/api";

function AdminMediaPageContent() {
  const dt = useDataTable({ defaultPageSize: 100 });
  const type = dt.getFilter("type");
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  const filters = useMemo(() => ({ per_page: 100 }), []);
  const mediaQuery = useAdminQuery<PaginatedResponse<RawMediaRow>>(adminQueryKeys.media.list(filters), "/media", filters);

  const items = useMemo(() => {
    let list = (mediaQuery.data?.items ?? []).map(toMediaItem);
    if (type) list = list.filter((m) => m.type === type);
    if (dt.search) list = list.filter((m) => m.filename.toLowerCase().includes(dt.search.toLowerCase()));
    return list;
  }, [mediaQuery.data, type, dt.search]);

  // Derived from the live query data (not a snapshot captured on click) so the
  // drawer picks up the rename/alt-text save it just made instead of showing the
  // pre-edit copy until the drawer is closed and reopened.
  const activeItem = useMemo(
    () => (activeItemId !== null ? (items.find((i) => i.id === activeItemId) ?? null) : null),
    [items, activeItemId]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.media.list() });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return adminApi.post("/media", formData);
    },
    onSuccess: () => {
      showSuccess("File uploaded");
      invalidate();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Upload failed"),
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => adminApi.delete(`/media/${id}`))),
    onSuccess: () => {
      showSuccess("Media deleted");
      setSelectedIds([]);
      invalidate();
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div>
      <PageHeader title="Media Library" description={`${mediaQuery.data?.meta.total ?? "…"} files`} />

      <MediaUploadDropzone
        uploading={upload.isPending}
        onFiles={(files) => Array.from(files).forEach((file) => upload.mutate(file))}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            placeholder="Search filename…"
            defaultValue={dt.search}
            onChange={(e) => dt.setSearch(e.target.value)}
            className="w-64 pl-10"
          />
        </div>
        <Select value={type} onChange={(e) => dt.setFilter("type", e.target.value || null)} className="w-40">
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
        </Select>

        {selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-3 rounded-sm border border-primary/20 bg-primary/5 px-4 py-2">
            <span className="text-body font-semibold text-ink">{selectedIds.length} selected</span>
            <Button size="sm" variant="danger" onClick={() => bulkDelete.mutate(selectedIds)} loading={bulkDelete.isPending}>
              Delete
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-caption font-semibold text-ink-muted hover:text-ink"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        {mediaQuery.isLoading ? (
          <p className="text-body text-ink-muted">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={ImageIcon} title="No media found" message="Upload files or adjust your search." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onClick={() => setActiveItemId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <MediaDetailDrawer item={activeItem} onClose={() => setActiveItemId(null)} />
    </div>
  );
}

export default function AdminMediaPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AdminMediaPageContent />
    </Suspense>
  );
}
