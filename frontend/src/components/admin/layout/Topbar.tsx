"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, Bell, LogOut, ChevronDown, Languages } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdminLogout } from "@/lib/admin/hooks/useAdminAuth";
import { useSidebar } from "./SidebarContext";
import { NAV_ITEMS, isNavGroup } from "./nav-items";
import { Avatar } from "@/components/admin/ui/Avatar";
import { Input } from "@/components/admin/ui/Input";

function useCurrentSectionLabel(): string {
  const pathname = usePathname();
  for (const item of NAV_ITEMS) {
    if (isNavGroup(item)) {
      const child = item.children.find((c) => pathname === c.href || pathname?.startsWith(`${c.href}/`));
      if (child) return `${item.label} / ${child.label}`;
    } else if (pathname === item.href || pathname?.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }
  return "Admin Dashboard";
}

export function Topbar() {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebar();
  const sectionLabel = useCurrentSectionLabel();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Cosmetic only — admin chrome stays English; this previews which bilingual
  // field (name_en/name_ar) editors are focused on, wired up in a later phase.
  const [displayLocale, setDisplayLocale] = useState<"EN" | "AR">("EN");

  const router = useRouter();
  const logout = useAdminLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success("Logged out");
        router.replace("/admin/login");
      },
    });
  };

  const notifications = [
    { id: 1, text: "4 products are low on stock", tone: "warning" as const },
    { id: 2, text: "3 new orders awaiting processing", tone: "info" as const },
  ];

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 print:hidden md:px-6">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="rounded-sm p-2 text-ink-muted hover:bg-app md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1 text-body font-semibold text-ink md:text-caption md:font-medium md:uppercase md:tracking-wide md:text-ink-muted">
        {sectionLabel}
      </div>

      <div className="flex items-center gap-1">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <Input
              autoFocus
              placeholder="Search…"
              onBlur={() => setSearchOpen(false)}
              className="h-9 w-44 sm:w-64"
            />
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="rounded-sm p-2 text-ink-muted hover:bg-app"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        {/* Language display toggle (cosmetic) */}
        <button
          type="button"
          onClick={() => setDisplayLocale((v) => (v === "EN" ? "AR" : "EN"))}
          title="Preview bilingual fields (display only)"
          className="hidden items-center gap-1 rounded-sm px-2 py-2 text-caption font-semibold text-ink-muted hover:bg-app sm:flex"
        >
          <Languages className="h-4 w-4" />
          {displayLocale}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className="relative rounded-sm p-2 text-ink-muted hover:bg-app"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-md">
                <div className="border-b border-border px-4 py-3 text-label font-semibold text-ink">
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-body text-ink-muted">No new notifications.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {notifications.map((n) => (
                      <li key={n.id} className="flex items-start gap-2 px-4 py-3 text-body text-ink">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            n.tone === "warning" ? "bg-warning" : "bg-info"
                          }`}
                        />
                        {n.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-body font-medium text-ink hover:bg-app"
          >
            <Avatar name={user?.name} size="sm" />
            <span className="hidden sm:inline">{user?.name ?? "Admin"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-md">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-body font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-caption text-ink-muted">{user?.email}</p>
                </div>
                <Link
                  href="/admin/profile"
                  className="block px-4 py-2.5 text-body text-ink hover:bg-app"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-body text-danger hover:bg-app disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
