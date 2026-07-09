"use client";

import { useState, useRef, useEffect } from "react";
import { List, Grid2X2, Filter, X, ChevronDown, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion, animate, useMotionValue } from "framer-motion";
import { useShopFilters } from "@/hooks/useShopFilters";

function AnimatedCounter({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      if (nodeRef.current) nodeRef.current.textContent = value.toLocaleString();
    } else {
      const controls = animate(motionValue, value, {
        duration: 0.4,
        onUpdate: (latest) => {
          if (nodeRef.current) {
            nodeRef.current.textContent = Math.round(latest).toLocaleString();
          }
        }
      });
      return controls.stop;
    }
  }, [value, motionValue, shouldReduceMotion]);

  return <span ref={nodeRef} className="font-bold text-foreground">{value.toLocaleString()}</span>;
}

export function ShopToolbar({
  totalResults, 
  activeFilters, 
  onRemoveFilter, 
  onOpenMobileFilters,
  viewMode,
  onViewModeChange
}: { 
  totalResults: number;
  activeFilters: { label: string; value: string; id: string }[];
  onRemoveFilter: (id: string) => void;
  onOpenMobileFilters: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}) {
  const t = useTranslations("shop.toolbar");
  const shouldReduceMotion = useReducedMotion();
  const [sortOpen, setSortOpen] = useState(false);
  const { sort, setSort, setPage } = useShopFilters();
  const sortValue = sort || "featured";

  const SORT_OPTIONS = [
    { id: "featured", label: t("sortFeatured") },
    { id: "price_asc", label: t("sortPriceAsc") },
    { id: "price_desc", label: t("sortPriceDesc") },
    { id: "newest", label: t("sortNewest") },
  ];

  const { scrollY } = useScroll();
  const headerShadow = useTransform(scrollY, [0, 100], ["none", "0 2px 8px hsl(var(--foreground) / 0.06)"]);

  return (
    <motion.div 
      className="sticky top-[82px] z-40 w-full border-b bg-background"
      style={{ 
        boxShadow: shouldReduceMotion ? "none" : headerShadow,
      }}
    >
      <div className="mx-auto flex min-h-[64px] max-w-wrap items-center justify-between px-6 md:px-14">
        
        {/* Left: Results Count */}
        <div className="hidden text-sm font-medium text-muted-foreground lg:block">
          {t("showing")} <AnimatedCounter value={totalResults} /> {t("parts")}
        </div>

        {/* Middle: Applied Filters */}
        <div className="hidden flex-1 items-center gap-2 px-8 lg:flex">
          <div className="flex flex-wrap items-center gap-2">
            <AnimatePresence>
              {activeFilters.slice(0, 4).map((f) => (
                <motion.span 
                  key={f.id}
                  layout={!shouldReduceMotion}
                  initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.8 }}
                  whileHover={{ scale: shouldReduceMotion ? 1 : 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary border px-3 py-1 text-xs font-medium text-foreground origin-center"
                >
                  <span className="text-muted-foreground">{f.label}:</span> {f.value}
                  <button onClick={() => onRemoveFilter(f.id)} className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            {activeFilters.length > 4 && (
              <span className="text-xs font-medium text-muted-foreground">{t("moreFilters", { count: activeFilters.length - 4 })}</span>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex w-full items-center justify-between lg:w-auto lg:justify-end gap-4">
          <button 
            onClick={onOpenMobileFilters}
            className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Filter className="h-4 w-4" />
            {t("filtersButton")} {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
          
          <div className="flex items-center gap-4 relative">
            
            {/* Custom Animated Sort Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setSortOpen(!sortOpen)}
                className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {SORT_OPTIONS.find(o => o.id === sortValue)?.label}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -8, scale: shouldReduceMotion ? 1 : 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8, scale: shouldReduceMotion ? 1 : 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 rounded-md border bg-card p-1 shadow-lifted transform-gpu origin-top-right"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => { setSort(option.id === "featured" ? null : option.id); setPage(1); setSortOpen(false); }}
                          className="relative flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none transition-colors duration-100 hover:bg-secondary focus-visible:bg-secondary"
                        >
                          <span className="w-4 flex items-center justify-center">
                            <AnimatePresence>
                              {sortValue === option.id && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                  <Check className="h-4 w-4 text-primary" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </span>
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="hidden items-center rounded-md border p-1 bg-card lg:flex">
              <button 
                onClick={() => onViewModeChange("grid")}
                className={`rounded p-1 transition-colors ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => onViewModeChange("list")}
                className={`rounded p-1 transition-colors ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
