import { motion, useReducedMotion, Variants } from "framer-motion";

export function ProductCardSkeleton() {
  const shouldReduceMotion = useReducedMotion();

  const shimmer: Variants = {
    hidden: { x: "-100%" },
    visible: { 
      x: "100%",
      transition: {
        repeat: Infinity,
        ease: "easeInOut",
        duration: 1.4
      }
    }
  };

  const gradientBg = "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)";

  return (
    <div className="relative flex h-[420px] w-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative aspect-[4/5] w-full shrink-0 bg-secondary overflow-hidden">
        {!shouldReduceMotion && (
          <motion.div 
            className="absolute inset-0 z-10"
            style={{ background: gradientBg }}
            variants={shimmer}
            initial="hidden"
            animate="visible"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 relative overflow-hidden">
        {!shouldReduceMotion && (
          <motion.div 
            className="absolute inset-0 z-10"
            style={{ background: gradientBg }}
            variants={shimmer}
            initial="hidden"
            animate="visible"
          />
        )}
        <div className="mb-2 h-3 w-16 rounded bg-secondary" />
        <div className="mb-1 h-4 w-full rounded bg-secondary" />
        <div className="mb-3 h-4 w-3/4 rounded bg-secondary" />
        
        <div className="mt-auto flex items-end justify-between">
          <div className="h-6 w-24 rounded bg-secondary" />
          <div className="h-4 w-12 rounded bg-secondary" />
        </div>
      </div>
    </div>
  );
}
