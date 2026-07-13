"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Clock, ArrowRight } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function SiteSearch({ scrolled }: { scrolled: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Focus on slash or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data } = useProducts(
    { q: debouncedQuery, per_page: 4 },
    { enabled: debouncedQuery.length > 0 }
  );
  const results = query ? data?.data || [] : [];

  return (
    <div ref={containerRef} className="relative z-[70] flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Search"
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          isOpen ? "bg-secondary text-foreground" : scrolled ? "text-navy-foreground hover:bg-navy-soft/20" : "text-foreground hover:bg-secondary"
        }`}
      >
        <Search className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute right-0 top-14 w-[360px] md:w-[480px] rounded-xl border bg-card p-4 shadow-2xl rtl:left-0 rtl:right-auto"
          >
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, brands, SKU... (Press / to focus)"
                className="h-12 w-full rounded-md border bg-secondary/50 pl-10 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary rtl:pl-10 rtl:pr-10"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rtl:left-3 rtl:right-auto"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!query && (
              <div className="px-2">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Searches</h3>
                <div className="flex flex-col gap-1">
                  {["brake pads", "oil filter", "bosch"].map(term => (
                    <button key={term} onClick={() => setQuery(term)} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground hover:bg-secondary text-left">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query && results.length > 0 && (
              <div>
                <h3 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Products</h3>
                <div className="flex flex-col gap-2">
                  {results.map(product => (
                    <Link
                      key={product.id}
                      href={`/shop/product/${product.id}` as any}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-4 rounded-md p-2 hover:bg-secondary"
                    >
                      <div className="h-12 w-12 shrink-0 rounded bg-[#F5F6F8] p-1">
                        <img src={product.images[0] || "/placeholder-product.svg"} alt="" className="h-full w-full object-contain" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {product.brand ? (locale === "ar" ? product.brand.name_ar : product.brand.name_en) : ""}
                        </span>
                        <span className="line-clamp-1 text-sm font-semibold">{locale === 'ar' ? product.name_ar : product.name_en}</span>
                        <span className="text-xs font-bold text-primary">AED {product.price_aed}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/shop?q=${query}`}
                  onClick={() => setIsOpen(false)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-secondary py-3 text-sm font-bold text-foreground hover:bg-secondary/80"
                >
                  View all results <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </div>
            )}

            {query && results.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No results found for "{query}"</p>
                <p className="mt-1 text-xs text-muted-foreground">Check spelling or try a different term</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
