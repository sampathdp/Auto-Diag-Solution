"use client";

import { useCompareStore } from "@/store/useCompareStore";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export function CompareBar() {
  const { items, removeItem, clearCompare } = useCompareStore();
  const t = useTranslations("shop.compareBar");
  const [mounted, setMounted] = useState(false);
  const { data: comparedProducts = [] } = useProductsByIds(items);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {comparedProducts.length > 0 && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] backdrop-blur-md md:p-6"
        >
          <div className="mx-auto flex max-w-wrap flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div>
                <div className="text-sm font-bold text-foreground">{t("title")}</div>
                <div className="text-xs text-muted-foreground">{t("selected", { count: comparedProducts.length })}</div>
              </div>
              <div className="hidden h-10 w-px bg-border md:block" />
              <div className="flex flex-1 items-center gap-3 overflow-x-auto md:flex-none">
                <AnimatePresence mode="popLayout">
                  {comparedProducts.map((p) => (
                    <motion.div
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      key={p.id}
                      className="relative h-14 w-14 shrink-0 rounded-md border bg-white p-1 shadow-soft"
                    >
                      <button
                        onClick={() => removeItem(p.id)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <img src={p.images[0] || "/placeholder-product.svg"} alt="" className="h-full w-full object-contain" />
                    </motion.div>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - comparedProducts.length) }).map((_, i) => (
                    <motion.div
                      layout
                      key={`empty-${i}`}
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed bg-secondary/50"
                    >
                      <span className="text-xs text-muted-foreground/50">{i + comparedProducts.length + 1}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex w-full items-center gap-3 md:w-auto">
              <Button variant="secondary" onClick={clearCompare} className="flex-1 md:flex-none">
                {t("clear")}
              </Button>
              <Button
                asChild
                className={`flex-1 md:flex-none ${comparedProducts.length <= 1 ? "pointer-events-none opacity-50" : ""}`}
              >
                <Link href="/compare" aria-disabled={comparedProducts.length <= 1} tabIndex={comparedProducts.length <= 1 ? -1 : undefined}>
                  {comparedProducts.length > 1 ? t("compareNow") : t("addMore")}
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
