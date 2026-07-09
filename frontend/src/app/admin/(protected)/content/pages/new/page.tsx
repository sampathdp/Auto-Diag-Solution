"use client";

import { PageHeader } from "@/components/admin/ui/PageHeader";
import { PageForm } from "@/components/admin/content/PageForm";

export default function AdminNewCmsPage() {
  return (
    <div>
      <PageHeader
        title="New Page"
        description="Create a new CMS page."
        breadcrumbs={[{ label: "Pages", href: "/admin/content/pages" }, { label: "New Page" }]}
      />
      <PageForm mode="create" />
    </div>
  );
}
