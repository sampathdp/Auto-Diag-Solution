import { CmsPageView } from "@/components/legal/CmsPageView";

export default async function CmsSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CmsPageView slug={slug} />;
}
