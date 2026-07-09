
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

const BRAND_CATEGORIES = [
  { name: "Sensors", image: "/prod-sensor.png" },
  { name: "Ignition", image: "/prod-sparkplug.png" },
  { name: "Air Filters", image: "/prod-cabinfilter.png" },
  { name: "Brake Pads", image: "/prod-brakepads.png" },
  { name: "Suspension", image: "/prod-shock.png" },
  { name: "Oil Filters", image: "/prod-oilfilter.png" },
];

export async function BrandsStrip() {
  const t = await getTranslations("home.brands");

  return (
    <section className="bg-background py-20 text-center">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        
        <div className="mb-14">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 px-3.5 py-1 text-[13px] font-bold text-primary uppercase tracking-widest">
            {t("eyebrow")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-[40px]">
            {t("title")}
          </h2>
        </div>

        <div className="group relative flex overflow-hidden mask-fade-edges">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex">
                {BRAND_CATEGORIES.map((item) => (
                  <div
                    key={item.name}
                    className="mx-6 flex w-[160px] shrink-0 flex-col items-center gap-4 transition-transform hover:-translate-y-1"
                  >
                    <div className="flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full border border-border/40 bg-white shadow-soft">
                      <div 
                        className="h-full w-full bg-cover bg-center transition-transform duration-500 hover:scale-110"
                        style={{ backgroundImage: `url('${item.image}')` }}
                      />
                    </div>
                    <span className="text-[15px] font-bold tracking-tight text-foreground/80">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-14 max-w-2xl text-[15px] leading-relaxed text-foreground/60">
          {t.rich("description", {
            br: () => <br className="hidden sm:block" />,
          })}
        </p>

        <div className="mt-8">
          <Link 
            href="/brands" 
            className="inline-flex items-center gap-1.5 text-[15px] font-bold text-primary transition-colors hover:text-primary/80"
          >
            {t("link")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={2.5} />
          </Link>
        </div>

      </div>
    </section>
  );
}
