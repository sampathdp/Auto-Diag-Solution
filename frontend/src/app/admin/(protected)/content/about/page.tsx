"use client";

import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { AboutPageForm } from "@/components/admin/content/AboutPageForm";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import type { AboutPage } from "@/types/aboutPage";

export default function AdminAboutPagePage() {
  const query = useAdminQuery<AboutPage>(["about-page"], "/about-page");

  if (query.isLoading || !query.data) return <FullScreenLoader label="Loading About Us page…" />;

  return (
    <div>
      <PageHeader title="About Us Page" description="Edit the storefront About Us page — hero, story, values, and milestones." />
      <AboutPageForm key={query.data.updated_at} page={query.data} />
    </div>
  );
}
