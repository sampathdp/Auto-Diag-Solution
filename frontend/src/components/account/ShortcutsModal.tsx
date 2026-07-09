"use client";

import { useState, useEffect } from "react";
import { X, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

type Shortcut = {
  keys: string[];
  description: string;
};

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], description: "Open Command Palette" },
  { keys: ["Ctrl", "K"], description: "Open Command Palette (Windows/Linux)" },
  { keys: ["?"], description: "Show this shortcuts menu" },
  { keys: ["ESC"], description: "Close active modal or drawer" },
];

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-lg pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Command className="h-5 w-5" /> Keyboard Shortcuts
                </h2>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                {SHORTCUTS.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, kIdx) => (
                        <kbd 
                          key={kIdx} 
                          className="flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 text-[11px] font-medium font-sans shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
