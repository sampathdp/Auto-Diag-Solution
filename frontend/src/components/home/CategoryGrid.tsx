import { getTranslations, getLocale } from "next-intl/server";
import { getHomeContent, cms } from "@/lib/home-content";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Cog, Disc, Filter, Zap, CarFront, Armchair, type LucideIcon } from "lucide-react";
import Image from "next/image";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

type Category = {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  image: string | null;
  products_count: number;
};

const TINTS = ["from-[#33231a]", "from-[#1c2636]", "from-[#2a2016]", "from-[#1a2e2a]", "from-[#2c1f2b]", "from-[#22283a]"];

// Purely decorative fallback when a category has no admin-uploaded image — no fake
// data involved, just a best-guess icon based on the (real) category name.
function iconForCategory(slug: string): LucideIcon {
  const s = slug.toLowerCase();
  if (s.includes("brake") || s.includes("disc") || s.includes("rotor")) return Disc;
  if (s.includes("filter")) return Filter;
  if (s.includes("electr") || s.includes("battery") || s.includes("alternator") || s.includes("starter")) return Zap;
  if (s.includes("body") || s.includes("bumper") || s.includes("mirror")) return CarFront;
  if (s.includes("interior") || s.includes("seat")) return Armchair;
  return Cog;
}

async function getActiveCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.items ?? []) as Category[];
  } catch {
    return [];
  }
}

export async function CategoryGrid() {
  const t = await getTranslations("home.categories");
  const locale = await getLocale();
  const home = await getHomeContent();
  const categories = (await getActiveCategories()).slice(0, 6);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section id="categories" className="bg-background py-14 md:py-28">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-accessible">
              <span className="block h-0.5 w-6 bg-primary" />
              {cms(home?.categories, "eyebrow", locale, t("eyebrow"))}
            </div>
            <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {cms(home?.categories, "title", locale, t("title"))}
            </h2>
          </div>
          <Link
            href="/shop"
            className="flex items-center gap-2 border-b-2 border-foreground pb-1 text-[13px] font-extrabold uppercase tracking-wide"
          >
            {t("viewAll")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
          {categories.map((cat, i) => {
            const Icon = iconForCategory(cat.slug);
            const name = locale === "ar" ? cat.name_ar : cat.name_en;
            return (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}` as any}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-navy shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lifted"
              >
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    loading="lazy"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${TINTS[i % TINTS.length]} to-navy`} />
                )}
                <Icon
                  aria-hidden
                  strokeWidth={1}
                  className="pointer-events-none absolute -end-5 -bottom-5 h-32 w-32 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
                />
                <span
                  aria-hidden
                  className="absolute start-4 top-4 h-4 w-4 border-s-2 border-t-2 border-white/25"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f141c]/90 via-[#0f141c]/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="text-lg font-extrabold">{name}</div>
                  <div className="mt-1 text-xs text-white/65">
                    <strong className="text-primary">{cat.products_count.toLocaleString()}</strong> {t("partsLabel")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
