import { getTranslations, getLocale } from "next-intl/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

type FeaturedReview = {
  rating: number;
  comment: string;
  reviewer_name: string | null;
  product_name_en: string | null;
  product_name_ar: string | null;
};

async function getFeaturedReview(): Promise<FeaturedReview | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/featured`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as FeaturedReview | null;
  } catch {
    return null;
  }
}

export async function Testimonial() {
  const t = await getTranslations("home.testimonial");
  const locale = await getLocale();
  const review = await getFeaturedReview();

  // No approved, commented review yet — nothing genuine to show, so skip the
  // section rather than fabricate a customer quote.
  if (!review) return null;

  const productName = locale === "ar" ? review.product_name_ar : review.product_name_en;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#101823] via-navy to-[#141a24] py-14 md:py-28">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(900px 500px at 15% 30%, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(900px 500px at 15% 30%, black, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[900px] px-6 md:px-14">
        <div className="font-serif text-[64px] leading-none text-primary sm:text-[88px]">&ldquo;</div>
        <blockquote className="text-[22px] font-bold leading-snug tracking-tight text-balance text-navy-foreground sm:text-[34px]">
          {review.comment}
        </blockquote>
        <div className="mt-8 flex items-center gap-3.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <div>
            <div className="text-sm font-extrabold text-navy-foreground">
              {review.reviewer_name || t("verifiedBuyer")}
            </div>
            <div className="text-[13px] text-navy-soft">
              {productName ? t("verifiedPurchase", { product: productName }) : t("verifiedBuyer")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
