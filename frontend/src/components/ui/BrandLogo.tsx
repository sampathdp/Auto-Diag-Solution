import Image from "next/image";
import { cn } from "@/lib/utils";
import logoHeader from "@/Assets/logo-header.png";
import logoIcon from "@/Assets/logo-icon.png";

const SOURCES = {
  /** Shield mark + "ASIL" wordmark — the default lockup for headers, footers, auth panels. */
  header: logoHeader,
  /** Shield mark only — compact square badges (admin sidebar rail, collapsed states). */
  icon: logoIcon,
} as const;

interface BrandLogoProps {
  variant?: keyof typeof SOURCES;
  className?: string;
  priority?: boolean;
}

/**
 * The source logo is a flattened JPEG on a white background (no alpha), so
 * it's wrapped in a white plate here rather than dropped directly onto the
 * navy header/footer — that's what keeps it crisp on both the light and
 * dark chrome instead of showing a white box on the dark ones.
 */
export function BrandLogo({ variant = "header", className, priority }: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-soft",
        className
      )}
    >
      <Image
        src={SOURCES[variant]}
        alt="ASIL Auto Parts Hub"
        className="h-full w-auto object-contain"
        priority={priority}
      />
    </span>
  );
}
