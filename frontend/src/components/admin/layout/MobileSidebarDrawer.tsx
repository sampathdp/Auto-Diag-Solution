"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { SidebarNav } from "./SidebarNav";
import { BrandLogo } from "@/components/ui/BrandLogo";

/**
 * Mobile nav uses a custom overlay (not the generic Drawer primitive) so the
 * whole panel — including its header — can be the dark sidebar background;
 * Drawer itself is styled light (bg-surface) for form-editing use elsewhere.
 */
export function MobileSidebarDrawer() {
  const { mobileOpen, setMobileOpen } = useSidebar();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen, setMobileOpen]);

  if (!mobileOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="fixed inset-0 bg-foreground/40 animate-in fade-in duration-150" onClick={() => setMobileOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-md animate-in slide-in-from-left duration-200"
      >
        <div className="flex h-16 items-center gap-2 border-b border-navy-border px-4">
          <BrandLogo variant="icon" className="h-8" />
          <span className="flex-1 text-label font-bold uppercase tracking-wide">ASIL</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="rounded-full p-1.5 text-sidebar-foreground/60 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </div>
    </div>,
    document.body
  );
}
