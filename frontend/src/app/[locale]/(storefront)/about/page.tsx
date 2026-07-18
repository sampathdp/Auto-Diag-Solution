import { AboutPageView } from "@/components/about/AboutPageView";
import { StatsStrip } from "@/components/home/StatsStrip";
import { Testimonial } from "@/components/home/Testimonial";
import { CtaBand } from "@/components/home/CtaBand";

export default function AboutPage() {
  return <AboutPageView statsStrip={<StatsStrip />} testimonial={<Testimonial />} ctaBand={<CtaBand />} />;
}
