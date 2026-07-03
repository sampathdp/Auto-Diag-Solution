import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Scissors, Users, Calendar, Settings,
  CreditCard, LogOut, Package, BarChart3, UsersRound, Building2, Clock, ShieldCheck, CheckCircle2, X, Briefcase, Receipt, MessageSquare, Lock, Settings2, FileText, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { usePermissions } from "@/hooks/usePermissions";

const menuItems = [
  // Admin Specific
  { icon: LayoutDashboard, label: "Admin Dashboard", path: "/admin/dashboard", permission: "admin.manage" },
  { icon: Clock, label: "Trial Requests", path: "/admin/trials", permission: "admin.manage" },
  { icon: MessageSquare, label: "Contact Messages", path: "/admin/messages", permission: "admin.manage" },
  { icon: Package, label: "Packages", path: "/admin/packages", permission: "admin.manage" },
  { icon: Tag, label: "Promo Codes", path: "/admin/promo-codes", permission: "admin.manage" },
  { icon: CreditCard, label: "Salon Payments", path: "/admin/payments", permission: "admin.manage" },
  { icon: Settings2, label: "System Settings", path: "/admin/system-settings", permission: "admin.manage" },
  { icon: FileText,  label: "Salon Invoices",  path: "/admin/invoices",         permission: "admin.manage" },
  { icon: Building2, label: "Salons", path: "/salons", permission: "salons.view" },

  // Salon Specific
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", permission: "appointments.view" },
  { icon: Briefcase, label: "Jobs", path: "/jobs", permission: "appointments.view" },
  { icon: Calendar, label: "Appointments", path: "/appointments", permission: "appointments.view" },
  { icon: Users, label: "Customers", path: "/customers", permission: "customers.view" },
  { icon: Scissors, label: "Services", path: "/services", permission: "services.view" },
  { icon: UsersRound, label: "Staff", path: "/staff", permission: "staff.view" },
  { icon: Package, label: "Inventory", path: "/inventory", permission: "inventory.view", required_plan: ["professional", "enterprise"] },
  { icon: CreditCard, label: "Billing", path: "/billing", permission: "billing.view", required_plan: ["professional", "enterprise"] },
  { icon: CheckCircle2, label: "Verify Payments", path: "/payments/verify", permission: "billing.accept_payment", required_plan: ["professional", "enterprise"] },
  { icon: Receipt, label: "Expenses", path: "/expenses", permission: "billing.view", required_plan: ["professional", "enterprise"] },
  { icon: BarChart3, label: "Reports", path: "/reports", permission: "reports.view" },
  { icon: Settings, label: "Settings", path: "/settings", permission: "settings.view" },
];

export const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { logout, user } = useAuthStore();
  const { can } = usePermissions();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-sm">S</div>
          <span className="hidden lg:inline">SalonFlow</span>
          <span className="lg:hidden text-lg">SalonFlow</span>
        </h1>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          // Check role-based visibility
          const isSuperAdmin = user?.role === 'super_admin';
          const isAdminRoute = item.path.startsWith('/admin') || item.path === '/salons';
          
          // Super Admin can see EVERYTHING if they want, but usually focused on Admin routes
          // If they have a targetSalonId (impersonating), they should definitely see salon routes
          const targetSalonId = useAuthStore.getState().targetSalonId;

          if (isSuperAdmin && !isAdminRoute && !targetSalonId) return null;
          if (!isSuperAdmin && isAdminRoute) return null;

          const isOwner = user?.role === 'salon_owner';
          if (item.permission !== "*" && !can(item.permission)) {
            // Only hide completely if they aren't the owner OR if it's not a plan-restricted feature.
            // Owners should always see plan-restricted features so they know what they are missing out on.
            if (!isOwner || !(item as any).required_plan) {
              return null;
            }
          }

          let isDisabled = false;
          let requiredPlanName = "";
          
          // Check subscription plan limits
          if ((item as any).required_plan) {
            const plan = (user?.plan_name || 'starter').toLowerCase();
            if (!(item as any).required_plan.includes(plan)) {
              isDisabled = true;
              const firstPlan = (item as any).required_plan[0];
              requiredPlanName = firstPlan.charAt(0).toUpperCase() + firstPlan.slice(1);
            }
          }

          if (isDisabled) {
            return (
              <div 
                key={item.path}
                className="relative flex items-center space-x-3 px-4 py-2.5 rounded-lg opacity-50 cursor-not-allowed group transition-all"
              >
                <item.icon size={20} className="text-slate-500" />
                <span className="font-medium text-slate-500 flex-1">{item.label}</span>
                <Lock size={14} className="text-slate-500" />
                
                {/* Tooltip */}
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700 pointer-events-none">
                  Requires {requiredPlanName} Plan
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[5px] border-transparent border-r-slate-800" />
                </div>
              </div>
            );
          }
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn(
                "flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        {user?.role === 'super_admin' && useAuthStore.getState().targetSalonId && (
          <button 
            onClick={() => {
              useAuthStore.getState().setTargetSalonId(null);
              window.location.href = '/admin/dashboard';
            }}
            className="flex items-center space-x-3 px-4 py-2.5 w-full bg-amber-600/10 text-amber-500 hover:bg-amber-600/20 rounded-lg transition-colors border border-amber-600/20"
          >
            <ShieldCheck size={20} />
            <span className="font-medium text-xs">Exit Impersonation</span>
          </button>
        )}
        <button 
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-2.5 w-full hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
