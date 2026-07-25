"use client";

import type { UseFormReturn } from "react-hook-form";
import { Modal } from "@/components/admin/ui/Modal";
import { Button } from "@/components/admin/ui/Button";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { formatAED, formatDateTime } from "@/lib/admin/utils";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";
import type { Category, MediaItem } from "@/mocks/admin/db";
import type { Product } from "@/types/product";

export function PreviewModal({
  open,
  onClose,
  form,
  categories,
  mediaById,
  product,
  saving,
  onSaveDraft,
  onPublish,
}: {
  open: boolean;
  onClose: () => void;
  form: UseFormReturn<ProductFormValues>;
  categories: Category[];
  mediaById: Map<number, MediaItem>;
  product?: Product;
  saving: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const values = form.watch();
  const category = categories.find((c) => c.id === Number(values.category_id));
  const primaryImage = mediaById.get(values.images[0]);
  const price = Number.isFinite(values.price) ? values.price : 0;
  const compareAt = values.compare_at_price;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Storefront Preview"
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="secondary" onClick={onSaveDraft} loading={saving}>
            Save as Draft
          </Button>
          <Button type="button" onClick={onPublish} loading={saving}>
            Publish
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-40 w-full">
            <MediaThumbnail item={primaryImage} size="lg" className="rounded-none" />
          </div>
          <div className="space-y-1.5 bg-surface p-3.5">
            {category && <p className="text-caption uppercase tracking-wide text-ink-muted">{category.name_en}</p>}
            <p className="line-clamp-2 text-body font-semibold text-ink">{values.name_en || "Product name"}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-h4 font-bold text-primary">{formatAED(price)}</span>
              {compareAt != null && compareAt > price && (
                <span className="text-caption text-ink-muted line-through">{formatAED(compareAt)}</span>
              )}
            </div>
          </div>
        </div>

        {product && (
          <div className="space-y-1 text-caption text-ink-muted">
            <p>Created {formatDateTime(product.created_at)}</p>
            <p>Last updated {formatDateTime(product.updated_at)}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
