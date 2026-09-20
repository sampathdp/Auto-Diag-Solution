import { Hero } from "@/components/home/Hero";
import { StatsStrip } from "@/components/home/StatsStrip";
import { AboutBand } from "@/components/home/AboutBand";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { BrandsStrip } from "@/components/home/BrandsStrip";
import { WhyUs } from "@/components/home/WhyUs";
import { Testimonial } from "@/components/home/Testimonial";
import { CtaBand } from "@/components/home/CtaBand";
import { getLocale } from "next-intl/server";
import { getHomeContent, cms } from "@/lib/home-content";

export default async function HomePage() {
  const locale = await getLocale();
  const home = await getHomeContent();
  return (
    <main>
      <Hero />
      <StatsStrip />
      <BrandsStrip />
      <AboutBand />
      <CategoryGrid />
      <ProductCarousel
        eyebrow={cms(home?.products, "eyebrow", locale, "")}
        title={cms(home?.products, "title", locale, "")}
      />
      <WhyUs />
      <Testimonial />
      <CtaBand />
    </main>
  );
}
