"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search, User, ShoppingCart, Menu, X, Heart } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useCartStore } from "@/store/useCartStore";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SiteSearch } from "./SiteSearch";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/shop", key: "shop" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const shouldReduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wishlistCount = useWishlistStore(state => state.items.length);
  const cartCount = useCartStore(state => state.items.reduce((sum, i) => sum + i.quantity, 0));
  const cartLastAddedAt = useCartStore(state => state.lastAddedAt);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-[60] border-b transition-colors duration-300",
        scrolled
          ? "border-navy-border bg-navy/90 backdrop-blur-md"
          : "border-border bg-background"
      )}
    >
      <div className="mx-auto flex h-[82px] max-w-wrap items-center justify-between gap-8 px-6 md:px-14">
        <Link href="/" className="flex items-center">
          <BrandLogo variant="header" className="h-12" priority />
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-semibold lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "relative py-1.5 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100",
                scrolled
                  ? "text-navy-soft hover:text-navy-foreground"
                  : "text-foreground/62 hover:text-foreground"
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <SiteSearch scrolled={scrolled} />
          <Link
            href="/account/overview"
            aria-label={t("account")}
            className={cn(scrolled ? "text-navy-foreground" : "text-foreground")}
          >
            <User className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <Link
            href="/account/wishlist"
            aria-label={t("wishlist")}
            className={cn("relative", scrolled ? "text-navy-foreground" : "text-foreground")}
          >
            <Heart className="h-5 w-5" strokeWidth={1.75} />
            {mounted && wishlistCount > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link
            id="header-cart-icon"
            href="/cart"
            aria-label={t("cart")}
            className={cn("relative", scrolled ? "text-navy-foreground" : "text-foreground")}
          >
            <motion.div
              key={cartLastAddedAt}
              initial={mounted && cartLastAddedAt && !shouldReduceMotion ? { scale: 1.5, rotate: -12 } : { scale: 1, rotate: 0 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
            </motion.div>
            {mounted && cartCount > 0 && (
              <motion.span
                key={`badge-${cartLastAddedAt}`}
                initial={shouldReduceMotion ? { scale: 1 } : { scale: 1.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "tween", duration: 0.3 }}
                className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              >
                {cartCount}
              </motion.span>
            )}
          </Link>
          <button
            aria-label={t("menu")}
            className={cn("lg:hidden", scrolled ? "text-navy-foreground" : "text-foreground")}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* mobile nav panel */}
      <div
        className={cn(
          "fixed inset-0 z-[80] flex flex-col bg-navy p-7 text-navy-foreground transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <BrandLogo variant="header" className="h-10" />
          <button aria-label="Close menu" onClick={() => setMobileOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-14 flex flex-col gap-7 text-2xl font-extrabold">
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setMobileOpen(false)}>
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
