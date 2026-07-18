"use client";

import { useLocale } from "next-intl";
import { ChevronRight, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { usePage } from "@/hooks/usePage";

const PROSE_CLASSES =
  "[&_h2]:mb-3 [&_h2]:mt-9 [&_h2:first-child]:mt-0 [&_h2]:text-[20px] [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-foreground " +
  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:text-foreground " +
  "[&_p]:mb-4 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/70 md:[&_p]:text-base " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 " +
  "[&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-foreground/70 md:[&_li]:text-base " +
  "[&_blockquote]:mb-4 [&_blockquote]:border-s-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground/60 " +
  "[&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2";

export function CmsPageView({ slug }: { slug: string }) {
  const locale = useLocale();
  const { data: page, isLoading, isError } = usePage(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="mx-auto flex max-w-wrap flex-col items-center justify-center px-6 py-32 text-center md:px-14">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page may have been unpublished or moved.</p>
        <Button asChild className="mt-6">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const title = locale === "ar" ? page.title_ar : page.title_en;
  const content = (locale === "ar" ? page.content_ar : page.content_en) ?? "";

  return (
    <main>
      {/* Hero */}
      <div className="relative h-[200px] w-full overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] text-navy-foreground lg:h-[240px]">
        <div
          aria-hidden
          className="absolute inset-y-0 end-0 z-[1] w-[60%] max-w-[560px] opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.30), transparent 72%)" }}
        />
        <div className="relative z-[2] mx-auto flex h-full max-w-wrap flex-col justify-end px-6 pb-8 md:px-14 lg:pb-10">
          <div className="mb-3 flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            Legal
          </div>
          <h1 className="mb-3 text-[28px] font-extrabold leading-[1.05] tracking-tight text-balance sm:text-[36px] lg:text-[44px]">
            {title}
          </h1>
          <nav className="flex items-center gap-x-4 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft/70">
            <Link href="/" className="hover:text-navy-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-navy-foreground">{title}</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <section className="bg-background py-14 md:py-24">
        <div className="mx-auto max-w-[760px] px-6 md:px-14">
          <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </section>
    </main>
  );
}
