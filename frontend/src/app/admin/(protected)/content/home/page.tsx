"use client";

import { PageHeader } from "@/components/admin/ui/PageHeader";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { HomePageForm } from "@/components/admin/content/HomePageForm";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import type { HomePage } from "@/types/homePage";

export default function AdminHomePagePage() {
  const query = useAdminQuery<HomePage>(["home-page"], "/home-page");

  if (query.isLoading || !query.data) return <FullScreenLoader label="Loading home page…" />;

  return (
    <div>
      <PageHeader title="Home Page" description="Edit the storefront home page — hero, stats, about band, section headings, why-us cards, and call-to-action." />
      <HomePageForm key={query.data.updated_at} page={query.data} />
    </div>
  );
}
