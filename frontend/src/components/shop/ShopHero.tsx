"use client";

import { Link } from "@/i18n/navigation";
import { motion, useScroll, useTransform, useReducedMotion, Variants } from "framer-motion";
import { useRef } from "react";
import { useTranslations } from "next-intl";

export function ShopHero({ categoryName, totalProducts, breadcrumbs, bgImage = "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1600&q=80" }: { 
  categoryName: string; 
  totalProducts?: number; 
  breadcrumbs: { label: string; href: string }[];
  bgImage?: string;
}) {
  const t = useTranslations("shop.hero");
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <div ref={ref} className="relative h-[240px] w-full overflow-hidden bg-gradient-to-b from-navy via-[#1E2530] to-[#141a24] text-navy-foreground lg:h-[380px]">
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: `url(${bgImage})`,
          y: shouldReduceMotion ? "0%" : y
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141a24] via-[#141a24]/70 to-[#141a24]/30" />
      <div
        aria-hidden
        className="absolute inset-y-0 end-0 z-[1] w-[50%] max-w-[600px] opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.30), transparent 72%)" }}
      />

      <div className="relative mx-auto flex h-full max-w-wrap flex-col justify-end px-6 pb-8 md:px-14 lg:pb-12">
        <div className="relative z-10 flex w-full items-end justify-between">
          <motion.div
            className="max-w-2xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-3 flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="block h-0.5 w-6 bg-primary" />
              {t("eyebrow")}
            </motion.div>
            <motion.h1 variants={itemVariants} className="mb-4 text-[36px] font-extrabold leading-[0.98] tracking-tight text-balance sm:text-[48px] lg:text-[64px]">{categoryName}</motion.h1>
            <motion.p variants={itemVariants} className="mb-6 max-w-[520px] text-sm leading-relaxed text-navy-soft lg:text-base">
              {t("description")}
            </motion.p>

            <motion.nav variants={itemVariants} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft/70">
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-x-4">
                  {idx > 0 && <span className="h-1 w-1 rounded-full bg-navy-soft/40" />}
                  <Link href={crumb.href as any} className="hover:text-navy-foreground transition-colors">
                    {crumb.label}
                  </Link>
                </div>
              ))}
            </motion.nav>
          </motion.div>

          {totalProducts !== undefined && (
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-soft backdrop-blur-md">
                {t("productsAvailable", { count: totalProducts.toLocaleString() })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
