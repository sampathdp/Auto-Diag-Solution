"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Wrench } from "lucide-react";

interface FlyData {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

/**
 * Shared "spare part hops into the cart" animation used by every add-to-cart entry
 * point. A small wrench badge (not the product photo — keeps it light and playful)
 * arcs slowly from the button to the cart. Prefers the floating cart button as the
 * landing target and falls back to the header cart icon when the floating button
 * isn't mounted yet — e.g. adding the very first item, before the cart has anything
 * in it.
 */
export function useFlyToCart() {
  const shouldReduceMotion = useReducedMotion();
  const [flyData, setFlyData] = useState<FlyData | null>(null);

  const triggerFly = (fromEl: HTMLElement | null) => {
    if (shouldReduceMotion || !fromEl || typeof window === "undefined") return;

    const rect = fromEl.getBoundingClientRect();
    const target = document.getElementById("cart-fab") || document.getElementById("header-cart-icon");
    const targetRect = target?.getBoundingClientRect();
    const targetCenterX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth - 24;
    const targetCenterY = targetRect ? targetRect.top + targetRect.height / 2 : 64;

    setFlyData({
      x: rect.left + rect.width / 2 - 18,
      y: rect.top - 18,
      targetX: targetCenterX - 18,
      targetY: targetCenterY - 18,
    });
    setTimeout(() => setFlyData(null), 1400);
  };

  const flyPortal = flyData && typeof window !== "undefined" ? createPortal(
    <motion.div
      initial={{
        position: "fixed",
        top: flyData.y,
        left: flyData.x,
        width: 36,
        height: 36,
        opacity: 1,
        scale: 0.6,
        rotate: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
      animate={{
        top: [flyData.y, flyData.y - 90, flyData.targetY],
        left: [flyData.x, (flyData.x + flyData.targetX) / 2, flyData.targetX],
        scale: [0.6, 1, 0.4],
        opacity: [1, 1, 0],
        rotate: [0, 200, 380],
      }}
      transition={{ type: "tween", duration: 1.2, times: [0, 0.55, 1], ease: "easeInOut" }}
      className="flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lifted"
    >
      <Wrench className="h-4 w-4" strokeWidth={2.25} />
    </motion.div>,
    document.body
  ) : null;

  return { triggerFly, flyPortal };
}
