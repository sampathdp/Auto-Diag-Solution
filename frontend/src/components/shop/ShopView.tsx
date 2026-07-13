"use client";

import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useShopFilters } from "@/hooks/useShopFilters";
import { ProductCard } from "./ProductCard";
import { ProductListRow } from "./ProductListRow";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { ShopSidebar } from "./ShopSidebar";
import { ShopHero } from "./ShopHero";
import { ShopToolbar } from "./ShopToolbar";
import { ShopPagination } from "./ShopPagination";
import { EmptyState } from "./EmptyState";
import { CompareBar } from "./CompareBar";
import { RecentlyViewed } from "./RecentlyViewed";
import { useCategories } from "@/hooks/useCategories";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { Product } from "@/types/storefront";
import { Loader2 } from "lucide-react";

export function ShopView({ initialCategory, hideCategoryFilter = false }: { initialCategory?: string, hideCategoryFilter?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("shop");
  const shouldReduceMotion = useReducedMotion();
  const { filters, clearFilters, setBrand, setCategory, brand, setFitsYear, setFitsMake, setFitsModel, setPage } = useShopFilters();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isInfinite, setIsInfinite] = useState(false);
  const [accumulated, setAccumulated] = useState<Product[]>([]);

  // Keyboard shortcut 'f' for filters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (window.innerWidth < 1024) {
          setMobileFiltersOpen(prev => !prev);
        } else {
          // Focus the search input in the sidebar if desktop
          const sidebarSearch = document.querySelector('.lg\\:block input[type="text"]') as HTMLInputElement;
          if (sidebarSearch) sidebarSearch.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // If category is enforced by route, override the URL filter
  const activeFilters = { ...filters };
  if (initialCategory) activeFilters.category = initialCategory;

  const { data, isLoading, isFetching } = useProducts(activeFilters);
  const { data: categories } = useCategories();

  useEffect(() => {
    if (data?.data) {
      if (isInfinite) {
        if (data.page === 1) {
          setAccumulated(data.data);
        } else {
          setAccumulated(prev => {
            const newItems = data.data.filter(d => !prev.some(p => p.id === d.id));
            return [...prev, ...newItems];
          });
        }
      } else {
        setAccumulated(data.data);
      }
    }
  }, [data, isInfinite]);

  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({
    rootMargin: "200px",
  });

  useEffect(() => {
    if (isInfinite && loadMoreInView && data && data.page < data.totalPages && !isFetching) {
      setPage(data.page + 1);
    }
  }, [isInfinite, loadMoreInView, data, isFetching, setPage]);

  // Derive Hero props
  let categoryName = locale === "ar" ? "كل القطع" : "All Auto Parts";
  let bgImage = "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1600&q=80";
  const breadcrumbs = [
    { label: locale === "ar" ? "الرئيسية" : "Home", href: "/" },
    { label: locale === "ar" ? "المتجر" : "Shop", href: "/shop" }
  ];

  if (activeFilters.category) {
    const cat = categories?.find((c) => c.slug === activeFilters.category);
    if (cat) {
      categoryName = locale === "ar" ? cat.name_ar : cat.name_en;
      breadcrumbs.push({ label: categoryName, href: `/shop/${cat.slug}` });
      if (cat.slug === "brakes") bgImage = "https://images.unsplash.com/photo-1590518776085-f55ebce3dcad?w=1600&q=80";
    }
  } else if (activeFilters.q) {
    categoryName = (locale === "ar" ? "بحث: " : "Search: ") + activeFilters.q;
  }

  // Derive active filter chips
  const activeFilterChips = [];
  if (activeFilters.category && !initialCategory) {
    activeFilterChips.push({ id: "category", label: t("filterChip.category"), value: activeFilters.category });
  }
  if (brand) {
    brand.forEach((b) => {
      activeFilterChips.push({ id: `brand-${b}`, label: t("filterChip.brand"), value: b });
    });
  }
  if (activeFilters.fits_model) {
    activeFilterChips.push({ id: "vehicle", label: t("filterChip.vehicle"), value: `${activeFilters.fits_year} ${activeFilters.fits_make} ${activeFilters.fits_model}` });
  }

  const handleRemoveFilter = (id: string) => {
    if (id === "category") setCategory(null);
    if (id.startsWith("brand-")) {
      const bId = id.replace("brand-", "");
      setBrand(brand?.filter(x => x !== bId).length ? brand.filter(x => x !== bId) : null);
    }
    if (id === "vehicle") {
      setFitsYear(null);
      setFitsMake(null);
      setFitsModel(null);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    // Smooth scroll back to top of the grid
    const gridTop = document.getElementById("shop-grid-top");
    if (gridTop) {
      gridTop.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
    }
  };

  const staggerVariants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.04 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
  };

  const pageVariants: Variants = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -10, transition: { duration: 0.2 } }
  };

  return (
    <>
      <ShopHero 
        categoryName={categoryName}
        totalProducts={data?.total}
        breadcrumbs={breadcrumbs}
        bgImage={bgImage}
      />
      
      <div id="shop-grid-top" className="scroll-mt-[146px]" />
      
      <ShopToolbar 
        totalResults={data?.total || 0}
        activeFilters={activeFilterChips}
        onRemoveFilter={handleRemoveFilter}
        onOpenMobileFilters={() => setMobileFiltersOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="mx-auto max-w-wrap px-6 md:px-14 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-10 xl:gap-14">
          
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-[146px] max-h-[calc(100vh-146px)] overflow-y-auto pb-8 pr-2">
              <ShopSidebar hideCategory={hideCategoryFilter} />
            </div>
          </div>
          
          {/* Main Grid Area */}
          <div className="flex-1 min-w-0">
            {/* Infinite Scroll Toggle */}
            <div className="mb-6 flex justify-end">
              <label className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-4 py-2 shadow-sm">
                <input
                  type="checkbox"
                  checked={isInfinite}
                  onChange={(e) => {
                    setIsInfinite(e.target.checked);
                    setPage(1); // Reset to page 1 on toggle
                  }}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-semibold text-foreground">{t("mobileFilters.infiniteScroll")}</span>
              </label>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-6"}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </motion.div>
              ) : accumulated.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <EmptyState onClear={clearFilters} />
                </motion.div>
              ) : (
                <motion.div 
                  key={isInfinite ? "infinite-grid" : `page-${data?.page || 1}`}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex flex-col"
                >
                  <motion.div 
                    layout={!shouldReduceMotion}
                    variants={staggerVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "100px" }}
                    className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-6"}
                  >
                    <AnimatePresence mode="popLayout">
                      {accumulated.map((product) => (
                        <motion.div 
                          key={product.id}
                          layoutId={shouldReduceMotion ? undefined : product.id}
                          layout={!shouldReduceMotion}
                          variants={itemVariants}
                          initial="hidden"
                          animate="show"
                          exit="exit"
                        >
                          {viewMode === "grid" ? (
                            <ProductCard product={product} />
                          ) : (
                            <ProductListRow product={product} />
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {/* Infinite Scroll Sentinel */}
                  {isInfinite && data && data.page < data.totalPages && (
                    <div ref={loadMoreRef} className="mt-8 flex justify-center py-4">
                      {isFetching && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                    </div>
                  )}

                  {!isInfinite && data && (
                    <div className="mt-12 flex justify-center">
                      <ShopPagination 
                        currentPage={data.page} 
                        totalPages={data.totalPages}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <RecentlyViewed />
          </div>
        </div>
      </div>
      <CompareBar />

      {/* Mobile Filters Sheet with Framer Motion */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div 
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div 
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag={shouldReduceMotion ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setMobileFiltersOpen(false);
                }
              }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-[20px] bg-background shadow-xl lg:hidden"
            >
              {/* Drag Handle */}
              <div className="flex h-1.5 w-full items-center justify-center pt-3 pb-4 cursor-grab active:cursor-grabbing">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              </div>
              
              <div className="flex items-center justify-between border-b px-6 pb-4 pt-2">
                <h2 className="text-lg font-bold text-foreground">{t("mobileFilters.heading")}</h2>
                <button onClick={() => setMobileFiltersOpen(false)} className="rounded-full p-2 hover:bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                <ShopSidebar hideCategory={hideCategoryFilter} isMobile={true} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t bg-background p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <button onClick={clearFilters} className="font-semibold text-foreground underline">
                  {t("mobileFilters.clearAll")}
                </button>
                <button onClick={() => setMobileFiltersOpen(false)} className="rounded-md bg-primary px-8 py-3 font-bold text-primary-foreground shadow-sm transition-all active:scale-95">
                  {t("mobileFilters.showResults", { count: data?.total ?? 0 })}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
