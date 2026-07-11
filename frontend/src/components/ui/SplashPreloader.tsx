"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import logo from "@/Assets/Logo.jpeg";

const MIN_VISIBLE_MS = 1100;

/**
 * One-shot branded splash shown while the app boots. Mounted once in the
 * locale layout (not per-page), so it never reappears on client-side
 * navigation — only on a hard reload, matching the "loading screen" pattern
 * rather than a route-transition spinner.
 */
export function SplashPreloader() {
  const shouldReduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, MIN_VISIBLE_MS));
    const pageLoaded =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));

    Promise.all([minDelay, pageLoaded]).then(() => setReady(true));
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {!ready && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-navy"
        >
          <div className="relative flex items-center justify-center">
            {!shouldReduceMotion && (
              <span
                aria-hidden
                className="absolute h-56 w-56 rounded-full opacity-60 blur-3xl"
                style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent 70%)" }}
              />
            )}
            {!shouldReduceMotion && (
              <>
                <motion.span
                  className="absolute h-40 w-40 rounded-full border border-primary/40"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.span
                  className="absolute h-40 w-40 rounded-full border border-primary/40"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
                />
              </>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-3 shadow-lifted sm:h-44 sm:w-44"
            >
              <Image src={logo} alt="ASIL Auto Parts Hub" className="h-full w-full object-contain" priority />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="h-[3px] w-40 overflow-hidden rounded-full bg-navy-foreground/10"
          >
            {!shouldReduceMotion && (
              <motion.div
                className="h-full w-1/3 rounded-full bg-primary"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
