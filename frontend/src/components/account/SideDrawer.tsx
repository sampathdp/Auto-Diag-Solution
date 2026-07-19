"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

export function SideDrawer({ open, onOpenChange, title, children }: SideDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop — above the fixed WhatsApp/cart bubbles (z-[70]) so they don't float over the drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[80] bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[80] w-full max-w-md bg-background shadow-2xl transition-transform duration-300 ease-in-out sm:w-[400px]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
