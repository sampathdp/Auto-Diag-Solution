import type { MediaItem } from "@/mocks/admin/db";

/**
 * The real backend's media rows (backend/app/Repositories/MediaRepository.php) use
 * different field names/units than the mock MediaItem type this admin UI was built
 * against (original_filename vs filename, size_bytes vs size_kb, mime_type vs mime,
 * path vs url, no width/height/color at all). This adapter is the one place that
 * translation happens, so every consumer (Media Library page, and the product image
 * picker in a later phase) gets the same shape without duplicating the mapping.
 */
export interface RawMediaRow {
  id: number;
  path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  alt_text_en: string | null;
  alt_text_ar: string | null;
  uploaded_by: number | null;
  created_at: string;
}

const BACKEND_ORIGIN = (() => {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
})();

export function toMediaItem(row: RawMediaRow): MediaItem {
  return {
    id: row.id,
    filename: row.original_filename,
    type: row.mime_type.startsWith("image/") ? "image" : "document",
    mime: row.mime_type,
    size_kb: Math.round(row.size_bytes / 1024),
    // Not tracked by the real backend — MediaThumbnail renders the actual image for
    // type "image" instead of relying on these, and falls back to a neutral swatch
    // (below) only for documents or a failed image load.
    width: null,
    height: null,
    color: "#6b7280",
    url: `${BACKEND_ORIGIN}${row.path}`,
    alt_text_en: row.alt_text_en ?? "",
    alt_text_ar: row.alt_text_ar ?? "",
    uploaded_at: row.created_at,
  };
}
