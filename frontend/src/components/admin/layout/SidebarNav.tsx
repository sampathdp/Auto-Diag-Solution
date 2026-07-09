"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavGroup } from "./nav-items";

function isActiveHref(pathname: string | null, href: string) {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAV_ITEMS.filter(isNavGroup).map((group) => [
        group.label,
        group.children.some((child) => isActiveHref(pathname, child.href)),
      ])
    )
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        if (isNavGroup(item)) {
          const groupActive = item.children.some((child) => isActiveHref(pathname, child.href));
          const open = collapsed ? groupActive : (openGroups[item.label] ?? groupActive);

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => setOpenGroups((prev) => ({ ...prev, [item.label]: !open }))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-body font-medium transition-colors",
                  groupActive
                    ? "bg-white/10 text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                  </>
                )}
              </button>
              {!collapsed && open && (
                <div className="ml-4 mt-1 space-y-1 border-l border-navy-border pl-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = isActiveHref(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-sm px-3 py-2 text-body font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground"
                        )}
                      >
                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const active = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2.5 text-body font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-cta"
                : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}
