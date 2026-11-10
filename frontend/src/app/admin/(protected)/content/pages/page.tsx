"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Plus, FileText, Languages } from "lucide-react";
import { syncArabic } from "@/lib/admin/translate";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Button } from "@/components/admin/ui/Button";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { actionsColumn } from "@/components/admin/columns";
import { defaultRowActions } from "@/components/admin/ActionsMenu";
import { showSuccess, showError } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDate } from "@/lib/admin/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Page } from "@/types/page";

export default function AdminCmsPagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pagesQuery = useAdminQuery<PaginatedResponse<Page>>(adminQueryKeys.pages.all, "/pages", {
    per_page: 100,
  });
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  const deletePage = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/pages/${id}`),
    onSuccess: () => {
      showSuccess("Page deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.pages.all });
    },
  });

  const [translating, setTranslating] = useState(false);

  // Re-translates every page's Arabic title/content from its English text and saves.
  const translateAll = async () => {
    const pages = pagesQuery.data?.items ?? [];
    if (!pages.length) return;
    setTranslating(true);
    let done = 0;
    let failed = 0;
    for (const p of pages) {
      try {
        const r = await syncArabic(
          {
            title_en: p.title_en,
            title_ar: "",
            slug: p.slug,
            content_en: p.content_en ?? "",
            content_ar: "",
            is_published: p.is_published,
          },
          null,
          [
            { en: "title_en", ar: "title_ar" },
            { en: "content_en", ar: "content_ar", html: true },
          ]
        );
        if (r.failed.length) {
          failed++;
          continue;
        }
        const v = r.values;
        await adminApi.put(`/pages/${p.id}`, {
          ...v,
          title_ar: v.title_ar || p.title_ar,
          content_ar: v.content_ar || p.content_ar || "",
        });
        done++;
      } catch {
        failed++;
      }
    }
    setTranslating(false);
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.pages.all });
    if (done) showSuccess(`Arabic updated for ${done} page${done === 1 ? "" : "s"}`);
    if (failed) showError(`${failed} page${failed === 1 ? "" : "s"} could not be translated`);
  };

  const columns: ColumnDef<Page, any>[] = [
    {
      accessorKey: "title_en",
      header: "Page",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.title_en}</p>
          <p className="text-caption text-ink-muted" dir="rtl">
            {row.original.title_ar}
          </p>
        </div>
      ),
    },
    { accessorKey: "slug", header: "Slug" },
    {
      accessorKey: "is_published",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.is_published ? "published" : "draft"} />,
    },
    { accessorKey: "updated_at", header: "Last Updated", cell: ({ row }) => formatDate(row.original.updated_at) },
    actionsColumn<Page>((page) =>
      defaultRowActions({
        onEdit: () => router.push(`/admin/content/pages/${page.id}/edit`),
        onDelete: () => setDeleteTarget(page),
      })
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Bilingual CMS pages (Terms, Refund Policy, Privacy Policy, etc.)"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={translateAll} disabled={translating || pagesQuery.isLoading}>
              <Languages className="h-4 w-4" />
              {translating ? "Translating…" : "Update all Arabic"}
            </Button>
            <Button onClick={() => router.push("/admin/content/pages/new")}>
              <Plus className="h-4 w-4" />
              New Page
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={pagesQuery.data?.items ?? []}
        isLoading={pagesQuery.isLoading}
        onRowClick={(page) => router.push(`/admin/content/pages/${page.id}/edit`)}
        emptyState={{ icon: FileText, title: "No pages yet", message: "Create your first CMS page." }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deletePage.mutate(deleteTarget.id)}
        itemName={deleteTarget?.title_en ?? ""}
        itemLabel="page"
        loading={deletePage.isPending}
      />
    </div>
  );
}
