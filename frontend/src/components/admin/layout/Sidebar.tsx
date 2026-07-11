"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { SidebarNav } from "./SidebarNav";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function Sidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 print:hidden md:flex",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-navy-border px-4">
        <BrandLogo variant="icon" className="h-8" />
        {!collapsed && <span className="text-label font-bold uppercase tracking-wide">ASIL</span>}
      </div>

      <SidebarNav collapsed={collapsed} />

      <div className="border-t border-navy-border p-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center justify-center gap-2 rounded-sm px-3 py-2 text-caption font-medium text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
