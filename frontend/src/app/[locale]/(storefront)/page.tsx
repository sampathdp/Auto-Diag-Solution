import { Hero } from "@/components/home/Hero";
import { StatsStrip } from "@/components/home/StatsStrip";
import { AboutBand } from "@/components/home/AboutBand";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { BrandsStrip } from "@/components/home/BrandsStrip";
import { WhyUs } from "@/components/home/WhyUs";
import { Testimonial } from "@/components/home/Testimonial";
import { CtaBand } from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <StatsStrip />
      <AboutBand />
      <CategoryGrid />
      <ProductCarousel />
      <BrandsStrip />
      <WhyUs />
      <Testimonial />
      <CtaBand />
    </main>
  );
}
