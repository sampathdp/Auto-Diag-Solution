"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { UploadCloud, X } from "lucide-react";
import { adminApi } from "@/lib/admin/api-client";
import { showError } from "@/components/admin/ui/toast";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import { cn } from "@/lib/utils";

/** Upload a single image from the device and bind its resulting media URL to a form field. */
export function SingleImageUpload({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return adminApi.post<RawMediaRow>("/media", formData);
    },
    onSuccess: (row) => {
      setImageFailed(false);
      onChange(toMediaItem(row).url);
    },
    onError: () => showError("Upload failed"),
  });

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) upload.mutate(file);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-app">
          {!imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <UploadCloud className="h-5 w-5 text-ink-muted" />
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="text-caption font-semibold text-primary hover:underline disabled:opacity-60"
          >
            {upload.isPending ? "Uploading…" : "Replace image"}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-caption text-danger hover:underline"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!upload.isPending) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (upload.isPending) return;
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        if (!upload.isPending) inputRef.current?.click();
      }}
      aria-disabled={upload.isPending}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
        upload.isPending ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        dragActive ? "border-primary bg-primary/5" : "border-border bg-app hover:border-primary/40"
      )}
    >
      <UploadCloud className="h-5 w-5 text-ink-muted" />
      <p className="text-caption text-ink">
        <span className="font-semibold text-primary">
          {upload.isPending ? "Uploading…" : "Click to upload"}
        </span>
        {!upload.isPending && " or drag and drop"}
      </p>
      <p className="text-[11px] text-ink-muted">PNG, JPG or WEBP</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={upload.isPending}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
