"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { TranslateLabel } from "@/components/admin/ui/TranslateLabel";
import { showSuccess } from "@/components/admin/ui/toast";
import { MediaThumbnail } from "./MediaThumbnail";
import { adminApi } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDateTime } from "@/lib/admin/utils";
import { useTranslate } from "@/lib/admin/hooks/useTranslate";
import type { MediaItem } from "@/mocks/admin/db";

export function MediaDetailDrawer({
  item,
  onClose,
}: {
  item: MediaItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [filename, setFilename] = useState("");
  const [altEn, setAltEn] = useState("");
  const [altAr, setAltAr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const altText = useTranslate();

  const translateAltText = async () => {
    const translated = await altText.translate(altEn);
    if (translated) setAltAr(translated);
  };

  useEffect(() => {
    if (item) {
      setFilename(item.filename);
      setAltEn(item.alt_text_en);
      setAltAr(item.alt_text_ar);
    }
  }, [item]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.media.list() });

  const save = useMutation({
    // Backend column is `original_filename`, not `filename` — MediaItem.filename is
    // the frontend-adapted name (see mediaAdapter.ts), so a rename sends that key
    // explicitly rather than the adapted shape.
    mutationFn: (payload: Partial<MediaItem> & { original_filename?: string }) =>
      adminApi.put(`/media/${item!.id}`, payload),
    onSuccess: () => {
      showSuccess("Media updated");
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: () => adminApi.delete(`/media/${item!.id}`),
    onSuccess: () => {
      showSuccess("Media deleted");
      invalidate();
      setConfirmDelete(false);
      onClose();
    },
  });

  const copyUrl = () => {
    if (!item) return;
    navigator.clipboard.writeText(item.url).then(() => showSuccess("URL copied to clipboard"));
  };

  return (
    <>
      <Drawer open={!!item} onClose={onClose} title={item?.filename}>
        {item && (
          <div className="space-y-5">
            <div className="h-40 overflow-hidden rounded-lg border border-border">
              <MediaThumbnail item={item} size="lg" className="rounded-none" />
            </div>

            <FormField label="Filename" htmlFor="filename">
              <div className="flex gap-2">
                <Input id="filename" value={filename} onChange={(e) => setFilename(e.target.value)} />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => save.mutate({ original_filename: filename.trim() })}
                  loading={save.isPending}
                  disabled={!filename.trim() || filename.trim() === item.filename}
                >
                  Rename
                </Button>
              </div>
            </FormField>

            <dl className="grid grid-cols-2 gap-3 text-caption">
              <div>
                <dt className="text-ink-muted">Type</dt>
                <dd className="text-ink">{item.mime}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Size</dt>
                <dd className="text-ink">{item.size_kb} KB</dd>
              </div>
              {item.width && item.height && (
                <div>
                  <dt className="text-ink-muted">Dimensions</dt>
                  <dd className="text-ink">
                    {item.width}×{item.height}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-ink-muted">Uploaded</dt>
                <dd className="text-ink">{formatDateTime(item.uploaded_at)}</dd>
              </div>
            </dl>

            <FormField label="URL">
              <div className="flex gap-2">
                <Input readOnly value={item.url} className="font-mono text-caption" />
                <Button type="button" variant="secondary" onClick={copyUrl} aria-label="Copy URL">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </FormField>

            {item.type === "image" && (
              <>
                <FormField label="Alt Text (EN)" htmlFor="alt-en">
                  <Input id="alt-en" value={altEn} onChange={(e) => setAltEn(e.target.value)} />
                </FormField>
                <FormField
                  label={
                    <TranslateLabel
                      label="نص بديل (AR)"
                      translating={altText.translating}
                      disabled={!altEn.trim()}
                      onTranslate={translateAltText}
                    />
                  }
                  htmlFor="alt-ar"
                >
                  <Input id="alt-ar" dir="rtl" value={altAr} onChange={(e) => setAltAr(e.target.value)} />
                </FormField>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => save.mutate({ alt_text_en: altEn, alt_text_ar: altAr })}
                  loading={save.isPending}
                >
                  Save Alt Text
                </Button>
              </>
            )}

            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Button type="button" variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        itemName={item?.filename ?? ""}
        itemLabel="file"
        loading={remove.isPending}
      />
    </>
  );
}
