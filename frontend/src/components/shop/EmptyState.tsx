"use client";

import { FilterX } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export function EmptyState({ onClear }: { onClear: () => void }) {
  const t = useTranslations("shop.emptyState");
  const shouldReduceMotion = useReducedMotion();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
        delayChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-card p-8 text-center shadow-soft"
    >
      <motion.div 
        variants={item}
        animate={shouldReduceMotion ? {} : {
          y: [0, -6, 0]
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground"
      >
        <FilterX className="h-8 w-8" />
      </motion.div>
      <motion.h3 variants={item} className="mb-2 text-lg font-bold text-foreground">{t("title")}</motion.h3>
      <motion.p variants={item} className="mb-6 max-w-sm text-sm text-muted-foreground">
        {t("description")}
      </motion.p>
      <motion.div variants={item}>
        <Button onClick={onClear}>
          {t("clearFilters")}
        </Button>
      </motion.div>
    </motion.div>
  );
}
