"use client";

import { useRecentlyViewedStore } from "@/store/useRecentlyViewedStore";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { ProductCard } from "./ProductCard";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function RecentlyViewed() {
  const t = useTranslations("shop");
  const { items } = useRecentlyViewedStore();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [mounted, setMounted] = useState(false);
  const { data: products = [] } = useProductsByIds(items);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || items.length === 0 || products.length === 0) return null;

  return (
    <section ref={ref} className="mt-20 border-t pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          {t("recentlyViewed")}
        </h2>

        <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
          {products.map((product) => (
            <div key={product.id} className="w-[280px] shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
