"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/admin/ui/Modal";
import apiClient from "@/lib/api/client";
import { DOC_TYPE_LABEL, type DealerDocumentMeta } from "@/types/dealer";

export interface PrivateFile {
  /** API path that streams the file after a permission check, e.g. /admin/b2b/documents/3 */
  path: string;
  title: string;
  originalName: string;
  mimeType: string;
}

/**
 * Shows a private file (dealer document, payment receipt). The file is fetched with the
 * admin's session (the API checks the permission) and displayed from a temporary blob
 * URL, so it never has a public address.
 */
export function PrivateFileViewer({
  file,
  onClose,
  forbiddenMessage = "You don't have permission to view this file.",
}: {
  file: PrivateFile | null;
  onClose: () => void;
  forbiddenMessage?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const path = file?.path;

  useEffect(() => {
    if (!path) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(null);
    apiClient
      .get(path, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.status === 403 ? forbiddenMessage : "Could not load the file.");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, forbiddenMessage]);

  const isPdf = file?.mimeType === "application/pdf";

  return (
    <Modal
      open={!!file}
      onClose={onClose}
      title={file?.title ?? ""}
      description={file?.originalName}
      size="lg"
      footer={
        url && file ? (
          <div className="flex justify-end">
            <a
              href={url}
              download={file.originalName}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-border bg-app px-4 text-body font-medium text-ink hover:bg-border/10"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        ) : undefined
      }
    >
      <div className="flex min-h-[320px] items-center justify-center rounded-md bg-app">
        {error ? (
          <p className="text-body text-danger">{error}</p>
        ) : !url ? (
          <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
        ) : isPdf ? (
          <iframe title={file?.originalName} src={url} className="h-[70vh] w-full rounded-md border-0" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file?.originalName ?? "File"} className="max-h-[70vh] max-w-full rounded-md object-contain" />
        )}
      </div>
    </Modal>
  );
}

/** A dealer's licence or ID document (needs b2b.documents.view; the API logs the view). */
export function PrivateDocumentViewer({ doc, onClose }: { doc: DealerDocumentMeta | null; onClose: () => void }) {
  return (
    <PrivateFileViewer
      file={
        doc
          ? {
              path: `/admin/b2b/documents/${doc.id}`,
              title: DOC_TYPE_LABEL[doc.doc_type] ?? doc.doc_type,
              originalName: doc.original_name,
              mimeType: doc.mime_type,
            }
          : null
      }
      onClose={onClose}
      forbiddenMessage="You don't have permission to view dealer documents."
    />
  );
}
