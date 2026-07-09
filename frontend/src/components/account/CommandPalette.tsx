"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { Search, Home, ShoppingBag, User, Package, Car, MapPin, Heart, Bell, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CommandItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  category: "Account" | "Store";
};

const COMMANDS: CommandItem[] = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" />, path: "/", category: "Store" },
  { id: "shop", label: "Shop Parts", icon: <ShoppingBag className="h-4 w-4" />, path: "/shop", category: "Store" },
  { id: "overview", label: "Account Overview", icon: <User className="h-4 w-4" />, path: "/account/overview", category: "Account" },
  { id: "orders", label: "Order History", icon: <Package className="h-4 w-4" />, path: "/account/orders", category: "Account" },
  { id: "vehicles", label: "My Vehicles", icon: <Car className="h-4 w-4" />, path: "/account/vehicles", category: "Account" },
  { id: "wishlist", label: "Wishlist", icon: <Heart className="h-4 w-4" />, path: "/account/wishlist", category: "Account" },
  { id: "addresses", label: "Saved Addresses", icon: <MapPin className="h-4 w-4" />, path: "/account/addresses", category: "Account" },
  { id: "profile", label: "Profile Settings", icon: <Settings className="h-4 w-4" />, path: "/account/profile", category: "Account" },
  { id: "notifications", label: "Notification Preferences", icon: <Bell className="h-4 w-4" />, path: "/account/notifications", category: "Account" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    setOpen(false);
    router.push(path as any);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-2xl pointer-events-auto"
            >
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  ref={inputRef}
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Type a command or search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <span className="text-xs text-muted-foreground ml-2">ESC</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No results found.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredCommands.map((cmd) => (
                      <button
                        key={cmd.id}
                        onClick={() => handleSelect(cmd.path)}
                        className="flex w-full cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                      >
                        <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-md bg-background border">
                          {cmd.icon}
                        </span>
                        <span className="flex-1 text-left">{cmd.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {cmd.category}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
