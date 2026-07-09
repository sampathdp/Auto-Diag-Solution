"use client";

import { useState, useEffect } from "react";
import { useShopFilters } from "@/hooks/useShopFilters";
import { mockCategories, mockBrands } from "@/mocks/storefront/data";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, CheckCircle2, Star } from "lucide-react";
import * as Slider from "@radix-ui/react-slider";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { COMMON_VEHICLE_MAKES } from "@/lib/vehicleData";
import { Button } from "@/components/ui/Button";

function FilterSection({ 
  title, 
  children, 
  defaultExpanded = true,
  count = 0
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultExpanded?: boolean;
  count?: number;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="border-b border-border/60 py-5">
      <button
        className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-wider text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <span className="block h-0.5 w-4 bg-primary" />
          {title} {count > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">{count}</span>}
        </div>
        <motion.div
          initial={false}
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="mt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimatedCheckbox({ checked, onChange, label, type = "checkbox" }: { checked: boolean, onChange: () => void, label: React.ReactNode, type?: "checkbox" | "radio" }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <label className="flex items-center gap-3 cursor-pointer group select-none">
      <div className="relative flex h-5 w-5 items-center justify-center shrink-0">
        <input
          type={type}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <div className={`absolute inset-0 border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${type === "radio" ? "rounded-full" : "rounded"} ${checked ? "border-primary bg-primary" : "border-input bg-background group-hover:border-primary/50"}`} />
        <AnimatePresence>
          {checked && (
            <motion.svg
              initial={{ scale: shouldReduceMotion ? 1 : 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: shouldReduceMotion ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute z-10 h-3.5 w-3.5 text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                d="M20 6L9 17l-5-5"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>
      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
        {label}
      </span>
    </label>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function VehicleSelect({
  value,
  onChange,
  disabled,
  placeholder,
  options,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        className="h-11 w-full appearance-none rounded-full border-none bg-background px-4 pr-9 text-sm font-medium shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 rtl:pl-9 rtl:pr-4"
        value={value}
        disabled={disabled}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-4 rtl:right-auto" />
    </div>
  );
}

import { useSavedVehicles } from "@/hooks/useSavedVehicles";

export function ShopSidebar({ hideCategory = false, isMobile = false }: { hideCategory?: boolean, isMobile?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("shop.sidebar");
  const shouldReduceMotion = useReducedMotion();
  const { 
    category, setCategory, 
    brand, setBrand, 
    inStock, setInStock,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    rating, setRating,
    fitsYear, setFitsYear,
    fitsMake, setFitsMake,
    fitsModel, setFitsModel,
    clearFilters,
    q, setQ
  } = useShopFilters();

  const [searchInput, setSearchInput] = useState(q || "");
  const { savedVehicles, isAuthenticated } = useSavedVehicles();
  const [pendingYear, setPendingYear] = useState(fitsYear || "");
  const [pendingMake, setPendingMake] = useState(fitsMake || "");
  const [pendingModel, setPendingModel] = useState(fitsModel || "");

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== q) {
        setQ(searchInput || null);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, q, setQ]);

  // Sync back if q changes externally
  useEffect(() => {
    if (q !== searchInput) {
      setSearchInput(q || "");
    }
  }, [q]);

  // Reset the pending Y/M/M cascade whenever the applied vehicle filter is cleared elsewhere
  useEffect(() => {
    if (!fitsYear && !fitsMake && !fitsModel) {
      setPendingYear("");
      setPendingMake("");
      setPendingModel("");
    }
  }, [fitsYear, fitsMake, fitsModel]);

  const toggleBrand = (bId: string) => {
    const current = brand || [];
    if (current.includes(bId)) {
      setBrand(current.filter((x) => x !== bId).length ? current.filter((x) => x !== bId) : null);
    } else {
      setBrand([...current, bId]);
    }
  };

  const hasVehicle = fitsYear || fitsMake || fitsModel;
  const hasAnyFilters = category || brand || inStock || minPrice || maxPrice || rating || hasVehicle || q;

  // Mock years and makes for the cascading dropdown
  const years = ["2024", "2023", "2022", "2021", "2020"];
  const makes = COMMON_VEHICLE_MAKES;
  const models = ["Land Cruiser", "Camry", "Hilux", "Patrol", "Altima", "F-150", "Explorer", "Accord", "CR-V", "LX 600"];

  return (
    <div className={`w-full flex-shrink-0 ${!isMobile ? "lg:w-[280px]" : ""}`}>
      
      {/* Search within filters */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none rtl:left-auto rtl:right-3">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <input 
          type="text" 
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full h-11 pl-9 pr-4 rounded-md border bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary rtl:pl-4 rtl:pr-9"
        />
      </div>

      {/* Vehicle Fitment */}
      <div className="mb-2 overflow-hidden rounded-xl bg-secondary/50">
        <FilterSection title={t("vehicleFitment")} defaultExpanded={true}>
          <div className="px-1 pb-1">
            {isAuthenticated && savedVehicles.length > 0 && !hasVehicle && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("myVehicles")}</p>
                <div className="flex flex-wrap gap-2">
                  {savedVehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setFitsYear(v.year.toString());
                        setFitsMake(v.make);
                        setFitsModel(v.model);
                      }}
                      className="rounded-full border bg-background px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary"
                    >
                      {v.nickname || `${v.year} ${v.make} ${v.model}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {hasVehicle ? (
              <div className="rounded-lg bg-background p-4 shadow-soft border">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t("showingPartsFor")}</p>
                    <p className="text-sm text-muted-foreground">{fitsYear} {fitsMake} {fitsModel}</p>
                    <button
                      onClick={() => { setFitsYear(null); setFitsMake(null); setFitsModel(null); }}
                      className="mt-2 text-xs font-bold text-primary hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {t("changeVehicle")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <VehicleSelect
                  value={pendingYear}
                  onChange={(e) => { setPendingYear(e.target.value); setPendingMake(""); setPendingModel(""); }}
                  placeholder={t("selectYear")}
                  options={years}
                />

                <VehicleSelect
                  value={pendingMake}
                  onChange={(e) => { setPendingMake(e.target.value); setPendingModel(""); }}
                  disabled={!pendingYear}
                  placeholder={t("selectMake")}
                  options={makes}
                />

                <VehicleSelect
                  value={pendingModel}
                  onChange={(e) => setPendingModel(e.target.value)}
                  disabled={!pendingMake}
                  placeholder={t("selectModel")}
                  options={models}
                />

                <Button
                  disabled={!pendingModel}
                  onClick={() => {
                    setFitsYear(pendingYear);
                    setFitsMake(pendingMake);
                    setFitsModel(pendingModel);
                  }}
                  className="mt-2 w-full"
                >
                  {t("findParts")}
                </Button>
              </div>
            )}
          </div>
        </FilterSection>
      </div>

      {/* Categories */}
      {!hideCategory && (
        <FilterSection title={t("category")} defaultExpanded={true}>
          <div className="flex flex-wrap gap-2">
            {mockCategories.map((c) => (
              <FilterChip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(category === c.id ? null : c.id)}
              >
                {locale === "ar" ? c.name_ar : c.name_en}
              </FilterChip>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Brands */}
      <FilterSection title={t("brand")} count={brand?.length}>
        <div className="flex max-h-[240px] flex-wrap gap-2 overflow-y-auto pr-1">
          {mockBrands.map((b) => (
            <FilterChip
              key={b.id}
              active={brand?.includes(b.id) || false}
              onClick={() => toggleBrand(b.id)}
            >
              {locale === "ar" ? b.name_ar : b.name_en}
            </FilterChip>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title={t("priceRange")}>
        <div className="px-2 pt-2 pb-4">
          <Slider.Root
            className="relative flex w-full touch-none select-none items-center"
            value={[minPrice || 0, maxPrice || 3000]}
            max={3000}
            step={10}
            onValueChange={(val) => {
              setMinPrice(val[0] === 0 ? null : val[0]);
              setMaxPrice(val[1] === 3000 ? null : val[1]);
            }}
          >
            <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
              <Slider.Range className="absolute h-full bg-primary transition-colors" />
            </Slider.Track>
            <Slider.Thumb asChild>
              <motion.div 
                whileHover={{ scale: 1.2 }} 
                whileDrag={{ scale: 1.3 }} 
                className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-grab active:cursor-grabbing"
              />
            </Slider.Thumb>
            <Slider.Thumb asChild>
              <motion.div 
                whileHover={{ scale: 1.2 }} 
                whileDrag={{ scale: 1.3 }} 
                className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-grab active:cursor-grabbing"
              />
            </Slider.Thumb>
          </Slider.Root>
          
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">{t("min")}</label>
              <input 
                type="number" 
                value={minPrice || ""} 
                onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" 
                placeholder="0" 
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">{t("max")}</label>
              <input 
                type="number" 
                value={maxPrice || ""} 
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" 
                placeholder="3000" 
              />
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title={t("availability")}>
        <AnimatedCheckbox
          checked={inStock || false}
          onChange={() => setInStock(!inStock || null)}
          label={<span className="font-bold">{t("inStockOnly")}</span>}
        />
      </FilterSection>

      {/* Rating */}
      <FilterSection title={t("rating")}>
        <div className="flex flex-col gap-3">
          {[4, 3, 2, 1].map((r) => (
            <AnimatedCheckbox
              key={r}
              type="radio"
              checked={rating === r}
              onChange={() => setRating(r)}
              label={
                <span className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r ? "fill-warning text-warning" : "text-muted"}`} />
                  ))}
                  <span className="ml-1">{t("andUp")}</span>
                </span>
              }
            />
          ))}
        </div>
      </FilterSection>

      <AnimatePresence>
        {hasAnyFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-8">
              <Button
                variant="secondary"
                onClick={clearFilters}
                className="w-full"
              >
                {t("clearAllFilters")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
