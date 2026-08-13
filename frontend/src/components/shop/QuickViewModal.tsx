"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@/types/storefront";
import { X, Check, ShoppingCart, MessageCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useShopFilters } from "@/hooks/useShopFilters";
import { productFitsVehicle } from "@/lib/productFitment";
import { useRecentlyViewedStore } from "@/store/useRecentlyViewedStore";
import { useCartStore } from "@/store/useCartStore";
import { useFlyToCart } from "@/hooks/useFlyToCart";
import toast from "react-hot-toast";

const WHATSAPP_NUMBER = "971501234567";

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const locale = useLocale();
  const t = useTranslations("shop.quickView");
  const name = locale === "ar" ? product.name_ar : product.name_en;
  const [mounted, setMounted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { fitsYear, fitsMake, fitsModel } = useShopFilters();
  const addToCart = useCartStore(state => state.addItem);
  const { triggerFly, flyPortal } = useFlyToCart();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
      useRecentlyViewedStore.getState().addViewedItem(product.id);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, product.id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  const hasVehicleContext = !!(fitsYear || fitsMake || fitsModel);
  const fitsPerfectly = hasVehicleContext
    ? productFitsVehicle(product, { year: fitsYear, make: fitsMake, model: fitsModel })
    : false;

  const isOutOfStock = product.stock === 0;
  const hasDiscount = !!product.compare_at_price;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product.id, quantity);
    toast.success(`Added ${quantity} × ${name} to cart`);
    triggerFly(buttonRef.current);
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi, I'd like to ask about ${name} (SKU: ${product.sku})`
  )}`;

  return <>
    {createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-lifted md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground rtl:left-4 rtl:right-auto"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left: Images */}
            <div className="flex w-full flex-col bg-[#F5F6F8] p-6 md:w-1/2">
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center p-8">
                <motion.img
                  layoutId={`product-img-${product.id}`}
                  src={product.images[activeImage] || "/placeholder-product.svg"}
                  alt={name}
                  className="h-full w-full object-contain"
                />
              </div>
              
              {product.images.length > 1 && (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-white p-2 transition-colors ${
                        activeImage === idx ? "border-primary" : "border-transparent hover:border-border"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Details */}
            <div className="flex w-full flex-col overflow-y-auto p-6 md:w-1/2 md:p-10">
              <div className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {product.brand ? (locale === "ar" ? product.brand.name_ar : product.brand.name_en) : ""}
              </div>
              <h2 className="mb-2 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                {name}
              </h2>
              <div className="mb-6 font-mono text-sm text-muted-foreground">
                SKU: {product.sku}
              </div>

              {hasVehicleContext && (
                <div className="mb-6 flex items-start gap-3 rounded-lg bg-secondary/50 p-4">
                  {fitsPerfectly ? (
                    <>
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      <span className="text-sm font-medium text-success">
                        {t("confirmedFit", { vehicle: `${fitsYear} ${fitsMake} ${fitsModel}` })}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                      <span className="text-sm font-medium text-warning">
                        {t("notConfirmedFit", { vehicle: `${fitsYear} ${fitsMake} ${fitsModel}` })}
                      </span>
                    </>
                  )}
                </div>
              )}

              <div className="mb-8 flex items-baseline gap-4">
                <span className={`text-4xl font-extrabold tracking-tight ${hasDiscount ? 'text-destructive' : 'text-foreground'}`}>
                  AED {product.price_aed.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-lg font-medium text-muted-foreground line-through">
                    AED {product.compare_at_price!.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Specs */}
              {product.specifications && product.specifications.length > 0 && (
                <div className="mb-8 border-y py-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t("specifications")}
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {product.specifications.map((spec) => (
                      <div key={spec.key_en}>
                        <dt className="text-muted-foreground">{locale === "ar" ? spec.key_ar : spec.key_en}</dt>
                        <dd className="font-medium text-foreground">{locale === "ar" ? spec.value_ar : spec.value_en}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Add to Cart Area */}
              <div className="mt-auto flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 items-center rounded-md border bg-background">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex h-full w-12 items-center justify-center text-lg hover:bg-secondary"
                    >-</button>
                    <span className="flex w-12 items-center justify-center font-bold">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="flex h-full w-12 items-center justify-center text-lg hover:bg-secondary"
                    >+</button>
                  </div>
                  <button
                    ref={buttonRef}
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-md bg-primary-accessible text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-cta transition-all hover:-translate-y-0.5 hover:bg-primary-accessible/90 hover:shadow-lifted disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 sm:text-[13px]"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {isOutOfStock ? t("outOfStock") : t("addToCart")}
                  </button>
                </div>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 border-success text-xs font-bold uppercase tracking-wide text-success transition-all hover:bg-success hover:text-success-foreground sm:text-[13px]"
                >
                  <MessageCircle className="h-5 w-5" />
                  {t("askWhatsApp")}
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
    )}
    {flyPortal}
  </>;
}
