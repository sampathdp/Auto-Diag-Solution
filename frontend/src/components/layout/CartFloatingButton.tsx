"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/store/useCartStore";

export function CartFloatingButton() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const items = useCartStore((state) => state.items);
  const lastAddedAt = useCartStore((state) => state.lastAddedAt);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  if (!mounted || totalItems === 0 || pathname?.includes("/cart")) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cart-fab"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="fixed bottom-24 end-6 z-[70]"
      >
        <Link
          id="cart-fab"
          href="/cart"
          aria-label={`View cart, ${totalItems} items`}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lifted transition-transform hover:scale-105"
        >
          <ShoppingCart className="h-6 w-6" strokeWidth={1.75} />
          <motion.span
            key={lastAddedAt}
            initial={shouldReduceMotion ? { scale: 1 } : { scale: 1.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background shadow-soft"
          >
            {totalItems}
          </motion.span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
