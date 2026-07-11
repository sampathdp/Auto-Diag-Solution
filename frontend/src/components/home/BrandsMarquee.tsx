"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { Brand } from "@/types/brand";

function BrandTile({ brand, name }: { brand: Brand; name: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Raw cursor offset from tile center, in [-0.5, 0.5]. Springs smooth both the
  // tilt-in on move and the snap-back to flat on mouse leave.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const springConfig = { stiffness: 300, damping: 25, mass: 0.5 };
  const sx = useSpring(px, springConfig);
  const sy = useSpring(py, springConfig);

  const rotateX = useTransform(sy, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const glareX = useTransform(sx, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(sy, [-0.5, 0.5], ["0%", "100%"]);
  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, hsl(var(--foreground) / 0.08), transparent 60%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div style={{ perspective: 800 }} className="shrink-0">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative flex h-28 w-44 items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-6 shadow-soft transition-colors duration-300 hover:bg-secondary sm:h-32 sm:w-52"
      >
        {/* Cursor-following glare — the "3D" light-catching cue on top of the tilt. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glareBackground }}
        />

        {brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo}
            alt={name}
            style={{ transform: "translateZ(24px)" }}
            className="max-h-10 w-auto max-w-full object-contain grayscale opacity-50 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 sm:max-h-12"
          />
        ) : (
          <span
            style={{ transform: "translateZ(24px)" }}
            className="text-[13px] font-extrabold uppercase tracking-wide text-foreground/40 transition-colors duration-300 group-hover:text-foreground"
          >
            {name}
          </span>
        )}
      </motion.div>
    </div>
  );
}

export function BrandsMarquee({ brands, locale }: { brands: Brand[]; locale: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="group/marquee relative overflow-hidden mask-fade-edges"
    >
      <div className="flex w-max animate-marquee gap-5 group-hover/marquee:[animation-play-state:paused]">
        {[0, 1].map((loop) => (
          <div key={loop} className="flex shrink-0 gap-5">
            {brands.map((brand) => (
              <BrandTile
                key={`${loop}-${brand.id}`}
                brand={brand}
                name={locale === "ar" ? brand.name_ar : brand.name_en}
              />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
