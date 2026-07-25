"use client";

import { useVehicleStore } from "@/store/useVehicleStore";
import { usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { X, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Vehicle fitment only affects shop browsing/comparison — hide the banner on pages
// (home, checkout, account, etc.) where "Shopping for: X" would just be noise.
const RELEVANT_PATH_PREFIXES = ["/shop", "/compare"];

export function ActiveVehicleBanner() {
  const { vehicle, clearVehicle } = useVehicleStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isRelevantPage = RELEVANT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!mounted || !vehicle || !isRelevantPage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full bg-navy text-navy-foreground overflow-hidden"
      >
        <div className="mx-auto flex max-w-wrap items-center justify-between px-6 py-2 text-sm md:px-14">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            <span className="font-medium text-navy-soft">Shopping for:</span>
            <span className="font-bold">
              {vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            </span>
          </div>
          <button 
            onClick={clearVehicle}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
