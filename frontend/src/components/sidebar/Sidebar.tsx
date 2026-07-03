import { NavLink } from "react-router-dom";
import { LayoutDashboard, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { usePermissions } from "@/hooks/usePermissions";

const menuItems: { icon: typeof LayoutDashboard; label: string; path: string; permission?: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
];

export const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { logout } = useAuthStore();
  const { can } = usePermissions();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Storefront</h1>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.permission && !can(item.permission)) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};
