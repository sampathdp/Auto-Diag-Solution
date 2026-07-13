"use client";

import { useRef, useState } from "react";
import { Product } from "@/types/storefront";
import { useLocale, useTranslations } from "next-intl";
import { Heart, Eye, Scale, CheckCircle2, AlertTriangle, Loader2, Check } from "lucide-react";
import { useShopFilters } from "@/hooks/useShopFilters";
import { useFlyToCart } from "@/hooks/useFlyToCart";
import { productFitsVehicle } from "@/lib/productFitment";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { QuickViewModal } from "./QuickViewModal";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useCompareStore } from "@/store/useCompareStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";

function ParticleBurst() {
  const particles = Array.from({ length: 5 }).map((_, i) => ({
    id: i,
    angle: (i * (360 / 5)) * (Math.PI / 180),
    distance: 20 + Math.random() * 15
  }));

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ 
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
        />
      ))}
    </>
  );
}

export function ProductCard({ product, context = "shop" }: { product: Product, context?: "shop" | "wishlist" }) {
  const locale = useLocale();
  const t = useTranslations("shop.toasts");
  const shouldReduceMotion = useReducedMotion();
  const name = locale === "ar" ? product.name_ar : product.name_en;
  
  const isWishlisted = useWishlistStore(state => state.hasItem(product.id));
  const toggleWishlist = useWishlistStore(state => state.toggleItem);
  const isCompared = useCompareStore(state => state.hasItem(product.id));
  const toggleCompare = useCompareStore(state => state.toggleItem);
  const compareCount = useCompareStore(state => state.items.length);
  const addToCart = useCartStore(state => state.addItem);

  const [showBurst, setShowBurst] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
  const [cartState, setCartState] = useState<"idle" | "loading" | "success">("idle");
  const { triggerFly, flyPortal } = useFlyToCart();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const globalVehicle = useVehicleStore(state => state.vehicle);
  const { fitsYear, fitsMake, fitsModel } = useShopFilters();

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isWishlisted) {
      if (!shouldReduceMotion) {
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 600);
      }
      toast.success(t("addedToWishlist"));
    }
    toggleWishlist(product.id);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCompared && compareCount >= 3) {
      toast.error(t("compareLimitReached"));
      return;
    }
    toggleCompare(product.id);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (cartState !== "idle") return;

    setCartState("loading");

    setTimeout(() => {
      addToCart(product.id);
      setCartState("success");
      triggerFly(buttonRef.current);
      setTimeout(() => {
        setCartState("idle");
      }, 2000);
    }, 400);
  };

  // Check fitment against both the shop filter AND the globally active vehicle
  const activeYear = fitsYear || globalVehicle?.year;
  const activeMake = fitsMake || globalVehicle?.make;
  const activeModel = fitsModel || globalVehicle?.model;

  const hasVehicleContext = !!(activeYear || activeMake || activeModel);
  const fitsPerfectly = hasVehicleContext
    ? productFitsVehicle(product, { year: activeYear, make: activeMake, model: activeModel })
    : false;

  const isOutOfStock = product.stock === 0;
  const hasDiscount = !!product.compare_at_price;
  const discountPercent = hasDiscount ? Math.round(((product.compare_at_price! - product.price_aed) / product.compare_at_price!) * 100) : 0;
  // Deterministic per-product "NEW" flag (stable across re-renders) instead of re-rolling on every render.
  const idHash = product.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const isNew = idHash % 10 > 6;
  const imageSrc = product.images[0] || "/placeholder-product.svg";

  return (
    <>
      <motion.div
        whileHover={shouldReduceMotion ? {} : "hover"}
        initial="rest"
        animate="rest"
        variants={{ rest: {}, hover: {} }}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-[10px] bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lifted"
      >
        <Link 
          href={`/shop/product/${product.id}` as any} 
          className="flex h-full w-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {/* Image Area (4:5) */}
          <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-[#F5F6F8]">
            <span
              aria-hidden
              className="pointer-events-none absolute start-4 top-4 z-10 h-4 w-4 border-s-2 border-t-2 border-foreground/10"
            />
            {/* Main Image with layoutId for QuickView */}
            <motion.img
              layoutId={`product-img-${product.id}`}
              src={imageSrc}
              alt={name}
              variants={shouldReduceMotion ? {} : { hover: { opacity: product.images[1] ? 0 : 1 } }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 h-full w-full object-contain p-6 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
            />
            {/* Hover Image */}
            {!shouldReduceMotion && product.images[1] && (
              <motion.img
                src={product.images[1]}
                alt={name}
                variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
                transition={{ duration: 0.3 }}
                className={`absolute inset-0 h-full w-full object-contain p-6 ${isOutOfStock ? 'grayscale' : ''}`}
              />
            )}

            {/* Top-Left Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1 z-10 rtl:left-auto rtl:right-3">
              {isOutOfStock && (
                <span className="rounded bg-destructive px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">
                  Out of Stock
                </span>
              )}
              {!isOutOfStock && hasDiscount && (
                <span className="rounded bg-destructive px-2 py-1 text-[10px] font-bold tracking-wider text-destructive-foreground shadow-sm">
                  -{discountPercent}%
                </span>
              )}
              {!isOutOfStock && isNew && (
                <span className="rounded bg-primary px-2 py-1 text-[10px] font-bold tracking-wider text-primary-foreground shadow-sm">
                  NEW
                </span>
              )}
            </div>

            {/* Top-Right Wishlist / Remove Button */}
            {context === "wishlist" ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id); }}
                aria-label="Remove from wishlist"
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rtl:left-3 rtl:right-auto hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <span className="sr-only">Remove</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </button>
            ) : (
              <motion.button
                onClick={handleWishlist}
                whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rtl:left-3 rtl:right-auto"
              >
                <AnimatePresence>
                  {showBurst && <ParticleBurst />}
                </AnimatePresence>
                <motion.div
                  initial={false}
                  animate={isWishlisted && !shouldReduceMotion ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3, type: "tween" }}
                >
                  <Heart className={`h-4 w-4 transition-colors ${isWishlisted ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                </motion.div>
              </motion.button>
            )}

            {/* Compare Toggle below Wishlist (hover-reveal, stays visible once active) */}
            {context !== "wishlist" && (
              <motion.button
                onClick={handleCompare}
                whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                aria-label={isCompared ? "Remove from compare" : "Add to compare"}
                aria-pressed={isCompared}
                variants={shouldReduceMotion ? {} : { rest: { opacity: isCompared ? 1 : 0, y: isCompared ? 0 : -8 }, hover: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.2 }}
                className={`absolute right-3 top-14 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-soft backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rtl:left-3 rtl:right-auto transition-colors ${isCompared ? "bg-primary text-primary-foreground" : "bg-background/90 text-muted-foreground hover:text-foreground"}`}
              >
                <Scale className="h-3.5 w-3.5" />
              </motion.button>
            )}

            {/* Bottom-Right Quick View Button (Hover Only) */}
            <motion.button
              onClick={handleQuickView}
              variants={shouldReduceMotion ? {} : { rest: { opacity: 0, y: 10, scale: 0.9 }, hover: { opacity: 1, y: 0, scale: 1 } }}
              transition={{ duration: 0.2, delay: 0.05 }}
              aria-label="Quick view"
              className="absolute bottom-16 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rtl:left-3 rtl:right-auto"
            >
              <Eye className="h-5 w-5" />
            </motion.button>

            {/* Bottom Slide-up Add to Cart Bar */}
            <motion.div 
              variants={shouldReduceMotion ? {} : { rest: { y: "100%" }, hover: { y: "0%" } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-10"
            >
              <button
                ref={buttonRef}
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full bg-primary py-3.5 flex items-center justify-center text-xs font-bold uppercase tracking-wide text-primary-foreground disabled:bg-muted disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-inset sm:text-[13px]"
              >
                <AnimatePresence mode="wait">
                  {cartState === "idle" && (
                    <motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      {isOutOfStock ? "Notify Me" : (context === "wishlist" ? "Move to Cart" : "Add to Cart")}
                    </motion.span>
                  )}
                  {cartState === "loading" && (
                    <motion.span key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </motion.span>
                  )}
                  {cartState === "success" && (
                    <motion.span key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-2">
                      <Check className="h-5 w-5" /> Added!
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          </div>

          {/* Content Area */}
          <div className="flex flex-1 flex-col p-4 bg-card z-20">
            {context === "wishlist" && hasDiscount && (
              <div className="mb-2 text-xs font-semibold text-success bg-success/10 w-fit px-2 py-0.5 rounded">
                Price dropped by {Math.round(product.compare_at_price! - product.price_aed)} AED
              </div>
            )}
            
            {/* Row 1: Brand */}
            <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {product.brand ? (locale === "ar" ? product.brand.name_ar : product.brand.name_en) : ""}
            </div>
            
            {/* Row 2: Title */}
            <h3 className="mb-1 line-clamp-2 min-h-[40px] text-[15px] font-bold leading-snug text-foreground">
              {name}
            </h3>
            
            {/* Row 3: SKU */}
            <div className="mb-3 font-mono text-[11px] text-muted-foreground">
              SKU: {product.sku}
            </div>

            {/* Row 4: Fitment Confirmation */}
            {hasVehicleContext && (
              <div className="mb-3 flex items-start gap-2 rounded-md bg-secondary/60 p-2.5">
                {fitsPerfectly ? (
                  <>
                    <CheckCircle2 className="mt-[1px] h-3.5 w-3.5 shrink-0 text-success" />
                    <span className="text-xs font-medium text-success leading-tight">
                      Fits your {fitsYear} {fitsMake} {fitsModel}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warning" />
                    <span className="text-xs font-medium text-warning leading-tight">
                      Fitment not confirmed for {fitsYear} {fitsMake} {fitsModel}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="mt-auto pt-3 border-t">
              {/* Row 5: Pricing */}
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={`text-[22px] font-extrabold tracking-tight ${hasDiscount ? 'text-destructive' : 'text-foreground'}`}>
                  AED {product.price_aed.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-sm font-medium text-muted-foreground line-through">
                    AED {product.compare_at_price!.toLocaleString()}
                  </span>
                )}
                <span className="text-[10px] font-medium text-muted-foreground uppercase">VAT incl.</span>
              </div>

              {/* Row 6: Low-stock warning only — "in stock" is the assumed default, no need to announce it */}
              {!isOutOfStock && product.stock <= 10 && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-warning">Only {product.stock} left</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>

      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
      {flyPortal}
    </>
  );
}
