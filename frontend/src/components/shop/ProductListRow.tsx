"use client";

import { useRef, useState } from "react";
import { Product } from "@/types/storefront";
import { useLocale, useTranslations } from "next-intl";
import { Heart, Eye, CheckCircle2, AlertTriangle, ShoppingCart, Loader2, Check } from "lucide-react";
import { useShopFilters } from "@/hooks/useShopFilters";
import { useFlyToCart } from "@/hooks/useFlyToCart";
import { productFitsVehicle } from "@/lib/productFitment";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { QuickViewModal } from "./QuickViewModal";
import { PartTypeBadge } from "./PartTypeBadge";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useCompareStore } from "@/store/useCompareStore";
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
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary pointer-events-none"
        />
      ))}
    </>
  );
}

export function ProductListRow({ product }: { product: Product }) {
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

  const handleCompare = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const hasVehicleContext = !!(fitsYear || fitsMake || fitsModel);
  const fitsPerfectly = hasVehicleContext
    ? productFitsVehicle(product, { year: fitsYear, make: fitsMake, model: fitsModel })
    : false;

  const isOutOfStock = product.stock === 0;
  const hasDiscount = !!product.compare_at_price;
  const discountPercent = hasDiscount ? Math.round(((product.compare_at_price! - product.price_aed) / product.compare_at_price!) * 100) : 0;
  const imageSrc = product.images[0] || "/placeholder-product.svg";
  const description =
    (locale === "ar" ? product.short_description_ar : product.short_description_en) ||
    (locale === "ar" ? product.description_ar : product.description_en);

  return (
    <>
      <motion.div
        whileHover={shouldReduceMotion ? {} : "hover"}
        initial="rest"
        animate="rest"
        variants={{ rest: {}, hover: {} }}
        className="group flex w-full flex-col sm:flex-row overflow-hidden rounded-[10px] bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lifted"
      >
        <Link 
          href={`/shop/product/${product.id}` as any}
          className="flex h-full w-full flex-col sm:flex-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {/* Image Area */}
          <div className="relative h-64 sm:h-auto sm:w-64 shrink-0 overflow-hidden bg-[#F5F6F8]">
            <span
              aria-hidden
              className="pointer-events-none absolute start-4 top-4 z-10 h-4 w-4 border-s-2 border-t-2 border-foreground/10"
            />
            <motion.img
              layoutId={`product-img-${product.id}`}
              src={imageSrc}
              alt={name}
              variants={shouldReduceMotion ? {} : { hover: { opacity: product.images[1] ? 0 : 1 } }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 h-full w-full object-contain p-4 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
            />
            {!shouldReduceMotion && product.images[1] && (
              <motion.img
                src={product.images[1]}
                alt={name}
                variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
                transition={{ duration: 0.3 }}
                className={`absolute inset-0 h-full w-full object-contain p-4 ${isOutOfStock ? 'grayscale' : ''}`}
              />
            )}
            
            <div className="absolute left-3 top-3 flex flex-col gap-1 z-10 rtl:left-auto rtl:right-3">
              {isOutOfStock && (
                <span className="rounded bg-destructive px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">Out of Stock</span>
              )}
              {!isOutOfStock && hasDiscount && (
                <span className="rounded bg-destructive px-2 py-1 text-[10px] font-bold tracking-wider text-destructive-foreground shadow-sm">-{discountPercent}%</span>
              )}
              {product.part_type && <PartTypeBadge type={product.part_type} />}
            </div>

            {/* Quick View Button on Image */}
            <motion.button
              onClick={handleQuickView}
              variants={shouldReduceMotion ? {} : { rest: { opacity: 0, y: 10, scale: 0.9 }, hover: { opacity: 1, y: 0, scale: 1 } }}
              transition={{ duration: 0.2, delay: 0.05 }}
              aria-label="Quick view"
              className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rtl:left-4 rtl:right-auto"
            >
              <Eye className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Content Area */}
          <div className="flex flex-1 flex-col sm:flex-row">
            {/* Middle Info Section */}
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {product.brand ? (locale === "ar" ? product.brand.name_ar : product.brand.name_en) : ""}
              </div>
              <h3 className="mb-2 text-lg font-bold leading-snug text-foreground">
                {name}
              </h3>
              <div className="mb-4 font-mono text-[11px] text-muted-foreground">
                SKU: {product.sku}
              </div>

              {hasVehicleContext && (
                <div className="mb-4 inline-flex items-start gap-2 rounded-md bg-secondary/60 p-2.5 max-w-fit">
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

              {description && (
                <p className="mt-auto hidden text-sm text-muted-foreground sm:block line-clamp-2">
                  {description}
                </p>
              )}
            </div>

            {/* Right Action Section */}
            <div className="flex flex-col justify-between border-t p-5 sm:w-[240px] sm:border-l sm:border-t-0 sm:p-6 bg-secondary/10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex flex-col">
                    <span className={`text-2xl font-extrabold tracking-tight ${hasDiscount ? 'text-destructive' : 'text-foreground'}`}>
                      AED {product.price_aed.toLocaleString()}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm font-medium text-muted-foreground line-through">
                        AED {product.compare_at_price!.toLocaleString()}
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-muted-foreground uppercase mt-1">{product.vat_inclusive ? "VAT incl." : "+ VAT"}</span>
                  </div>

                  {(isOutOfStock || product.stock <= 10) && (
                    <div className="mt-4 flex items-center gap-2">
                      {isOutOfStock ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">Out of Stock</span>
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-warning">Only {product.stock} left</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <motion.button
                    onClick={handleWishlist}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-background text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                  
                  <label 
                    className="flex cursor-pointer flex-col items-center gap-0.5 rounded-md p-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input 
                      type="checkbox"
                      checked={isCompared}
                      onChange={handleCompare}
                      className="h-3.5 w-3.5 cursor-pointer accent-primary"
                    />
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Compare</span>
                  </label>
                </div>
              </div>

              <button
                ref={buttonRef}
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="mt-6 flex w-full h-11 items-center justify-center gap-2 rounded-md bg-primary py-3 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-cta transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lifted disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 overflow-hidden sm:text-[13px]"
              >
                <AnimatePresence mode="wait">
                  {cartState === "idle" && (
                    <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {isOutOfStock ? "Notify Me" : "Add to Cart"}
                    </motion.div>
                  )}
                  {cartState === "loading" && (
                    <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </motion.div>
                  )}
                  {cartState === "success" && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-2">
                      <Check className="h-5 w-5" /> Added!
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
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
