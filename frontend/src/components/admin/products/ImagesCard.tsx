"use client";

import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, ImagePlus, Library, Trash2, UploadCloud } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { showError } from "@/components/admin/ui/toast";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { MediaLibraryPickerModal } from "@/components/admin/media/MediaLibraryPickerModal";
import { adminApi } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { cn } from "@/lib/utils";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";
import type { MediaItem } from "@/mocks/admin/db";

function SortableThumb({
  id,
  item,
  isPrimary,
  onRemove,
}: {
  id: number;
  item: MediaItem | undefined;
  isPrimary: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
        isDragging && "z-10 opacity-70"
      )}
    >
      <div className="h-24 w-full">
        <MediaThumbnail item={item} size="lg" className="rounded-none" />
      </div>
      {isPrimary && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
          Primary
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-1.5 top-1.5 hidden rounded-full bg-surface/90 p-1.5 text-danger shadow-sm group-hover:block"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute bottom-1.5 right-1.5 hidden rounded-full bg-surface/90 p-1.5 text-ink-muted shadow-sm group-hover:block active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ImagesCard({
  form,
  mediaById,
}: {
  form: UseFormReturn<ProductFormValues>;
  mediaById: Map<number, MediaItem>;
}) {
  const { watch, setValue } = form;
  const images = watch("images");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const uploadFile = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return adminApi.post<MediaItem>("/media", formData);
    },
    onSuccess: (item) => {
      setValue("images", [...watch("images"), item.id], { shouldDirty: true });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.media.list() });
    },
    onError: () => showError("Upload failed"),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => uploadFile.mutate(file));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.indexOf(Number(active.id));
    const newIndex = images.indexOf(Number(over.id));
    setValue("images", arrayMove(images, oldIndex, newIndex), { shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-h4 font-bold text-ink">Images</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
          <Library className="h-3.5 w-3.5" />
          Add from Library
        </Button>
      </CardHeader>
      <CardBody className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-border bg-app hover:border-primary/40"
          )}
        >
          <UploadCloud className="h-6 w-6 text-ink-muted" />
          <p className="text-body text-ink">
            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-caption text-ink-muted">PNG, JPG or WEBP</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {images.length === 0 ? (
          <div className="flex items-center gap-2 text-body text-ink-muted">
            <ImagePlus className="h-4 w-4" />
            No images yet — upload or add from the library.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {images.map((id, i) => (
                  <SortableThumb
                    key={id}
                    id={id}
                    item={mediaById.get(id)}
                    isPrimary={i === 0}
                    onRemove={() =>
                      setValue(
                        "images",
                        images.filter((imgId) => imgId !== id),
                        { shouldDirty: true }
                      )
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardBody>

      <MediaLibraryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        alreadySelectedIds={images}
        onConfirm={(ids) => {
          const merged = [...images, ...ids.filter((id) => !images.includes(id))];
          setValue("images", merged, { shouldDirty: true });
          setPickerOpen(false);
        }}
      />
    </Card>
  );
}
