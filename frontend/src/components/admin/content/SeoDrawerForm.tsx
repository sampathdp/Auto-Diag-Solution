"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Button";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { MediaLibraryPickerModal } from "@/components/admin/media/MediaLibraryPickerModal";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/mocks/admin/db";
import type { SeoRow } from "./seo-rows";

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

function CharCounter({ length, max }: { length: number; max: number }) {
  return (
    <span className={cn("text-caption", length > max ? "font-semibold text-danger" : "text-ink-muted")}>
      {length}/{max}
    </span>
  );
}

export function SeoDrawerForm({
  row,
  onClose,
  mediaById,
}: {
  row: SeoRow | null;
  onClose: () => void;
  /** Keyed by media id — used only to resolve a picked image back to a thumbnail preview. */
  mediaById: Map<number, MediaItem>;
}) {
  const queryClient = useQueryClient();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (row) {
      setTitleEn(row.title_en);
      setTitleAr(row.title_ar);
      setDescEn(row.description_en);
      setDescAr(row.description_ar);
      setOgImage(row.og_image);
    }
  }, [row]);

  // The real backend has no single upsert endpoint: a route only gets a SeoMeta
  // row once someone customizes it, so most rows start with no `overrideId` and
  // must be created (POST); only already-customized rows are updated (PUT/{id}).
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        path: row?.path,
        page_type: row?.page_type,
        reference_id: row?.reference_id,
        meta_title_en: titleEn,
        meta_title_ar: titleAr,
        meta_description_en: descEn,
        meta_description_ar: descAr,
        og_image: ogImage,
      };
      return row?.overrideId
        ? adminApi.put(`/seo/${row.overrideId}`, payload)
        : adminApi.post("/seo", payload);
    },
    onSuccess: () => {
      showSuccess("SEO settings saved");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.seo.all });
      onClose();
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save."),
  });

  const ogImageMedia = ogImage
    ? [...mediaById.values()].find((m) => m.url === ogImage)
    : undefined;

  return (
    <>
      <Drawer
        open={!!row}
        onClose={onClose}
        title={row?.name}
        width="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => save.mutate()} loading={save.isPending}>
              Save
            </Button>
          </>
        }
      >
        {row && (
          <div className="space-y-5">
            <p className="font-mono text-caption text-ink-muted">{row.path}</p>

            <Tabs defaultValue="en">
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ar">العربية</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <FormField label="SEO Title" htmlFor="seo-title-en">
                  <Input id="seo-title-en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
                  <div className="mt-1 flex justify-end">
                    <CharCounter length={titleEn.length} max={TITLE_MAX} />
                  </div>
                </FormField>
                <FormField label="Meta Description" htmlFor="seo-desc-en">
                  <Textarea id="seo-desc-en" rows={3} value={descEn} onChange={(e) => setDescEn(e.target.value)} />
                  <div className="mt-1 flex justify-end">
                    <CharCounter length={descEn.length} max={DESCRIPTION_MAX} />
                  </div>
                </FormField>
              </TabsContent>

              <TabsContent value="ar" className="space-y-4">
                <FormField label="عنوان السيو" htmlFor="seo-title-ar">
                  <Input id="seo-title-ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
                  <div className="mt-1 flex justify-end">
                    <CharCounter length={titleAr.length} max={TITLE_MAX} />
                  </div>
                </FormField>
                <FormField label="وصف السيو" htmlFor="seo-desc-ar">
                  <Textarea id="seo-desc-ar" dir="rtl" rows={3} value={descAr} onChange={(e) => setDescAr(e.target.value)} />
                  <div className="mt-1 flex justify-end">
                    <CharCounter length={descAr.length} max={DESCRIPTION_MAX} />
                  </div>
                </FormField>
              </TabsContent>
            </Tabs>

            <FormField label="Open Graph Image">
              <div className="flex items-center gap-3">
                <MediaThumbnail item={ogImageMedia} size="md" />
                <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                  <ImageIcon className="h-3.5 w-3.5" />
                  {ogImageMedia ? "Change" : "Choose Image"}
                </Button>
              </div>
            </FormField>

            <div>
              <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-ink-muted">
                Google Search Preview
              </p>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="truncate text-caption text-success">autopartsuae.ae{row.path}</p>
                <p className="truncate text-body font-medium text-[#1a0dab]">{titleEn || row.name}</p>
                <p className="mt-0.5 line-clamp-2 text-caption text-ink-muted">{descEn || "No meta description set."}</p>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <MediaLibraryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          const picked = ids[0] ? mediaById.get(ids[0]) : undefined;
          setOgImage(picked?.url ?? null);
          setPickerOpen(false);
        }}
      />
    </>
  );
}
