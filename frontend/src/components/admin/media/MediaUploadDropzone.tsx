"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function MediaUploadDropzone({ onFiles, uploading }: { onFiles: (files: FileList) => void; uploading: boolean }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        // Ignoring drops while a prior upload is still in flight, not just disabling
        // the click target, since drag-and-drop bypasses the <input disabled> below.
        if (uploading) return;
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        if (!uploading) inputRef.current?.click();
      }}
      aria-disabled={uploading}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
        uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        dragActive ? "border-primary bg-primary/5" : "border-border bg-app hover:border-primary/40"
      )}
    >
      <UploadCloud className="h-6 w-6 text-ink-muted" />
      <p className="text-body text-ink">
        <span className="font-semibold text-primary">Click to upload</span> or drag and drop files here
      </p>
      <p className="text-caption text-ink-muted">
        {uploading ? "Uploading…" : "PNG, JPG, WEBP or PDF — images are auto-converted to WebP"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        disabled={uploading}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
