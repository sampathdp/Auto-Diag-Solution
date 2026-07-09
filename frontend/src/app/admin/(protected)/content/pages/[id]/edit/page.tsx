"use client";

import { useParams } from "next/navigation";
import { FileX } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { PageForm } from "@/components/admin/content/PageForm";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import type { Page } from "@/types/page";

export default function AdminEditCmsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const pageQuery = useAdminQuery<Page>(adminQueryKeys.pages.detail(id), `/pages/${id}`);

  if (pageQuery.isLoading) return <FullScreenLoader label="Loading page…" />;
  if (!pageQuery.data) return <EmptyState icon={FileX} title="Page not found" message="It may have been deleted." />;

  return (
    <div>
      <PageHeader
        title={`Edit ${pageQuery.data.title_en}`}
        breadcrumbs={[{ label: "Pages", href: "/admin/content/pages" }, { label: "Edit" }]}
      />
      <PageForm mode="edit" page={pageQuery.data} />
    </div>
  );
}
