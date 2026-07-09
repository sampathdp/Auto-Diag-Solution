"use client";

import { useState } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/mocks/admin/db";

/**
 * Real uploaded images render as an actual <img> (the backend has real file
 * storage, unlike the mock, which had no binary storage and rendered every item
 * as a colored icon swatch via MediaItem.color). Falls back to the swatch+icon
 * for documents, and for images whose file fails to load.
 */
export function MediaThumbnail({
  item,
  size = "md",
  className,
}: {
  item: Pick<MediaItem, "type" | "color" | "url"> | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-full w-full" : "h-14 w-14";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";

  if (!item) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-sm bg-app text-ink-muted", sizeClass, className)}>
        <ImageIcon className={iconSize} />
      </div>
    );
  }

  if (item.type === "image" && item.url && !imageFailed) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-app", sizeClass, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  const Icon = item.type === "document" ? FileText : ImageIcon;

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-sm", sizeClass, className)}
      style={{ backgroundColor: `${item.color}1a` }}
    >
      <Icon className={iconSize} style={{ color: item.color }} />
    </div>
  );
}
