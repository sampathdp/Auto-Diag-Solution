"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Button } from "@/components/admin/ui/Button";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { actionsColumn } from "@/components/admin/columns";
import { defaultRowActions } from "@/components/admin/ActionsMenu";
import { showSuccess } from "@/components/admin/ui/toast";
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
          <Button onClick={() => router.push("/admin/content/pages/new")}>
            <Plus className="h-4 w-4" />
            New Page
          </Button>
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
