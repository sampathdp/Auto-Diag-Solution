"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/admin/ui/Modal";
import apiClient from "@/lib/api/client";
import { DOC_TYPE_LABEL, type DealerDocumentMeta } from "@/types/dealer";

/**
 * Shows a private dealer document. The file is fetched with the admin's session
 * (the API checks the b2b.documents.view permission and logs the view) and displayed
 * from a temporary blob URL, so it never has a public address.
 */
export function PrivateDocumentViewer({ doc, onClose }: { doc: DealerDocumentMeta | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(null);
    apiClient
      .get(`/admin/b2b/documents/${doc.id}`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.status === 403 ? "You don't have permission to view dealer documents." : "Could not load the document.");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc]);

  const isPdf = doc?.mime_type === "application/pdf";

  return (
    <Modal
      open={!!doc}
      onClose={onClose}
      title={doc ? DOC_TYPE_LABEL[doc.doc_type] ?? doc.doc_type : ""}
      description={doc?.original_name}
      size="lg"
      footer={
        url && doc ? (
          <div className="flex justify-end">
            <a
              href={url}
              download={doc.original_name}
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
          <iframe title={doc?.original_name} src={url} className="h-[70vh] w-full rounded-md border-0" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={doc?.original_name ?? "Document"} className="max-h-[70vh] max-w-full rounded-md object-contain" />
        )}
      </div>
    </Modal>
  );
}
