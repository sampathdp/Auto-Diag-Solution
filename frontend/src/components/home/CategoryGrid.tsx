import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Cog, Disc, Filter, Zap, CarFront, Armchair } from "lucide-react";

const CATEGORIES = [
  { key: "engine", count: "2,140", tint: "from-[#33231a]", icon: Cog, image: "/cat-engine.png" },
  { key: "brakes", count: "1,860", tint: "from-[#1c2636]", icon: Disc, image: "/cat-brakes.png" },
  { key: "filters", count: "980", tint: "from-[#2a2016]", icon: Filter, image: "/cat-filters.png" },
  { key: "electrical", count: "1,410", tint: "from-[#1a2e2a]", icon: Zap, image: "/cat-electrical.png" },
  { key: "body", count: "760", tint: "from-[#2c1f2b]", icon: CarFront, image: "/cat-body.png" },
  { key: "interior", count: "640", tint: "from-[#22283a]", icon: Armchair, image: "/cat-interior.png" },
] as const;

export async function CategoryGrid() {
  const t = await getTranslations("home.categories");

  return (
    <section id="categories" className="bg-background py-14 md:py-28">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("eyebrow")}
            </div>
            <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {t("title")}
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
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.key}
                href="/shop"
                className="group relative aspect-[3/4] overflow-hidden rounded-xl shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lifted"
              >
                <div
                  className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105`}
                  style={{ backgroundImage: `url('${cat.image}')` }}
                />
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
                  <div className="text-lg font-extrabold">{t(cat.key)}</div>
                  <div className="mt-1 text-xs text-white/65">
                    <strong className="text-primary">{cat.count}</strong> {t("partsLabel")}
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
