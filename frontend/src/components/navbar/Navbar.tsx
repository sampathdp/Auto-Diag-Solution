import { useState, useEffect } from "react";
import { Bell, ChevronDown, Store, Menu, Check, Calendar, Clock, AlertTriangle, Sparkles, X, Copy, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { useAppointments } from "@/hooks/useAppointments";
import { useInventory } from "@/hooks/useInventory";
import { useApiQuery } from "@/hooks/useApi";
import { toast } from "react-hot-toast";


export const Navbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const user = useAuthStore((state) => state.user);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const activeBranchName = useAuthStore((state) => state.activeBranchName);
  const setActiveBranch = useAuthStore((state) => state.setActiveBranch);

  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("dismissed_notifications");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { list: listAppointments } = useAppointments();
  const { list: listInventory } = useInventory();

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: appointments } = listAppointments(
    todayStr,
    todayStr,
    user?.role !== 'super_admin' ? activeBranchId : null,
    { enabled: !!user && user.role !== 'super_admin' }
  );

  const { data: inventory } = listInventory(
    user?.role !== 'super_admin' ? activeBranchId : null,
    { enabled: !!user && user.role !== 'super_admin' }
  );

  const { data: dashboardData } = useApiQuery<any>(
    ["dashboard-stats", activeBranchId],
    activeBranchId ? `/dashboard/stats?branch_id=${activeBranchId}` : "/dashboard/stats",
    { enabled: !!user && user.role !== 'super_admin' }
  );

  const subscription = dashboardData?.data?.subscription;

  // Salon slug + name for booking link and branch fallback
  const [salonSlug, setSalonSlug] = useState<string | null>(user?.salon_slug || null);
  const [salonName, setSalonName] = useState<string | null>(null);
  useEffect(() => {
    if (user?.salon_slug) setSalonSlug(user.salon_slug);
    if (user?.salon_id) {
      apiClient.get(`/salons/${user.salon_id}`).then(res => {
        const data = res.data.data;
        setSalonName(data.name || null);
        if (!user?.salon_slug) setSalonSlug(data.slug || null);
      }).catch(() => {});
    }
  }, [user?.salon_id]);

  const bookingUrl = salonSlug ? `${window.location.origin}/s/${salonSlug}` : null;

  const dismissNotification = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem("dismissed_notifications", JSON.stringify(updated));
  };

  const clearAllNotifications = (ids: string[]) => {
    const updated = [...dismissedIds, ...ids];
    setDismissedIds(updated);
    localStorage.setItem("dismissed_notifications", JSON.stringify(updated));
  };

  const parseAppointmentTime = (startTimeStr: string) => {
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const now = new Date();

  // 1. Subscription Alerts
  const subscriptionAlerts = [];
  if (user?.role !== 'super_admin' && subscription) {
    const isTrial = subscription.status === "trial";
    
    if (subscription.is_in_grace_period) {
      subscriptionAlerts.push({
        id: `trial-grace-period`,
        title: "PAYMENT OVERDUE",
        description: `Your trial has ended. Please upload your payment slip immediately to prevent losing system access.`,
        time: "System Warning",
        type: "danger" as const,
        icon: "alert" as const,
      });
    } else if (isTrial && subscription.expires_at) {
      const cleanExpiresAt = subscription.expires_at.includes(" ")
        ? subscription.expires_at.replace(" ", "T")
        : subscription.expires_at;
      const diffTime = new Date(cleanExpiresAt).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysLeft = diffDays > 0 ? diffDays : 0;
      
      subscriptionAlerts.push({
        id: `trial-status-${daysLeft}`,
        title: daysLeft <= 3 ? "Trial Expiring Soon" : "Free Trial Active",
        description: daysLeft <= 3
          ? `Your 14-day free trial ends in ${daysLeft} day(s). Upgrade to keep using all features.`
          : `Your 14-day free trial is active. You have ${daysLeft} day(s) remaining.`,
        time: "System Status",
        type: daysLeft <= 3 ? ("danger" as const) : ("info" as const),
        icon: "sparkles" as const,
      });
    }
  }

  // 2. Morning schedule summary
  const morningSummary = [];
  if (appointments && appointments.length > 0) {
    const activeCount = appointments.filter((apt: any) => apt.status !== 'cancelled' && apt.status !== 'blocked').length;
    if (activeCount > 0) {
      morningSummary.push({
        id: `morning-summary-${todayStr}-${activeBranchId}`,
        title: "Today's Schedule Summary",
        description: `You have ${activeCount} appointment(s) scheduled for today.`,
        time: "Today, Morning",
        type: "info" as const,
        icon: "calendar" as const,
      });
    }
  }

  // 3. Upcoming appointment reminders
  const todayAppointmentsReminders = (appointments || [])
    .filter((apt: any) => apt.status !== 'cancelled' && apt.status !== 'blocked')
    .map((apt: any) => {
      if (!apt.start_time) return null;
      const aptTime = parseAppointmentTime(apt.start_time);
      const diffMs = aptTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins > 0 && diffMins <= 60) {
        return {
          id: `apt-reminder-${apt.id}-${apt.start_time}`,
          title: "Upcoming Appointment",
          description: `Appointment with ${apt.customer_name || 'Customer'} (${apt.service_name || 'Service'}) starts at ${apt.start_time.slice(0, 5)} (in ${diffMins} mins).`,
          time: `${diffMins} mins left`,
          type: "warning" as const,
          icon: "clock" as const,
        };
      }
      return null;
    })
    .filter(Boolean) as any[];

  // 4. Low stock alerts
  const lowStockAlerts = (inventory || [])
    .map((item: any) => {
      const quantity = Number(item.quantity);
      const minRequired = Number(item.min_required || 10);
      if (quantity <= minRequired) {
        return {
          id: `low-stock-${item.id}-${item.quantity}`,
          title: "Low Stock Alert",
          description: `Product "${item.name}" is running low: only ${quantity} units left (Min: ${minRequired}).`,
          time: "Action Required",
          type: "danger" as const,
          icon: "alert" as const,
        };
      }
      return null;
    })
    .filter(Boolean) as any[];

  // Combine and filter dismissed
  const allNotifications = [
    ...subscriptionAlerts,
    ...morningSummary,
    ...todayAppointmentsReminders,
    ...lowStockAlerts,
  ];

  const notifications = allNotifications.filter(n => !dismissedIds.includes(n.id));
  const unreadCount = notifications.length;

  const { data: branches } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await apiClient.get("/branches");
      return res.data.data || [];
    },
    enabled: user?.role !== 'super_admin',
  });

  useEffect(() => {
    if (branches && branches.length > 0 && user?.branch_id !== null && user?.branch_id !== undefined) {
      // Branch-restricted users are locked to their assigned branch — enforce it
      const userBranch = branches.find((b: any) => b.id === Number(user.branch_id));
      if (userBranch && activeBranchId !== userBranch.id) {
        setActiveBranch(userBranch.id, userBranch.name);
      }
    }
    // Salon owners (branch_id = null) keep activeBranchId = null ("All Branches") by default.
    // They can freely switch branches via the dropdown — do NOT auto-select here.
  }, [branches, user?.branch_id]);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      {/* ── Booking Link Strip ─────────────────────────────────────────── */}
      {bookingUrl && user?.role !== 'super_admin' && (
        <div className="bg-indigo-600 px-4 md:px-6 py-2 flex items-center justify-between gap-3 overflow-hidden">
          {/* Left: label always visible, URL shown on md+ */}
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={13} className="text-indigo-200 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
              <span className="text-white text-[11px] font-black uppercase tracking-wide shrink-0 leading-tight">
                Book Online
              </span>
              <span className="text-indigo-300 text-[9px] leading-tight sm:hidden">
                Share your booking link with customers
              </span>
              <span className="text-indigo-300 text-[10px] hidden sm:block shrink-0">·</span>
              <code className="text-indigo-100 text-[11px] font-semibold truncate max-w-[200px] lg:max-w-xs hidden sm:block">
                {bookingUrl}
              </code>
            </div>
          </div>

          {/* Right: action buttons — always show text on mobile */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(bookingUrl);
                toast.success("Booking link copied!");
              }}
              className="flex items-center gap-1 text-indigo-200 hover:text-white hover:bg-indigo-500 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
              title="Copy booking link"
            >
              <Copy size={11} />
              <span>Copy</span>
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 bg-white text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
            >
              <ExternalLink size={11} />
              <span>Portal</span>
            </a>
            <a
              href={`https://wa.me/?text=Book%20your%20next%20appointment%20online!%20${encodeURIComponent(bookingUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* ── Main Navbar Row ────────────────────────────────────────────── */}
      <div className="h-14 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg"
        >
          <Menu size={20} />
        </button>

        {/* Global Branch Selector Switcher */}
        <div className="relative">
          {/* Single-branch staff: static label only, no dropdown */}
          {user?.branch_id != null ? (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full text-sm font-semibold text-slate-700 shadow-sm">
              <Store size={15} className="text-indigo-600" />
              <span className="truncate max-w-[140px] md:max-w-none">{activeBranchName}</span>
            </div>
          ) : (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full text-sm font-semibold text-slate-700 transition-all shadow-sm hover:bg-slate-100 cursor-pointer"
            >
              <Store size={15} className="text-indigo-600" />
              <span className="truncate max-w-[140px] md:max-w-none">
                {activeBranchId === null
                  ? (branches && branches.length === 0 && salonName ? salonName : "Consolidated (All Branches)")
                  : activeBranchName}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          )}

          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xl z-30 py-2.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5">
                  Select Location
                </p>

                {/* Consolidated — only shown when there are multiple branches */}
                {(!user?.branch_id) && branches && branches.length > 0 && (
                  <>
                    <button
                      onClick={() => { setActiveBranch(null, null); setIsOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Store size={14} className="text-slate-400" />
                        Consolidated (All Branches)
                      </span>
                      {activeBranchId === null && <Check size={14} className="text-indigo-600 stroke-[3]" />}
                    </button>
                    <div className="border-t border-slate-100 my-1.5" />
                  </>
                )}

                {/* Branches — if none, fall back to main salon from registration */}
                {branches && branches.length > 0 ? (
                  branches
                    .filter((b: any) => !user?.branch_id || b.id === Number(user.branch_id))
                    .map((b: any) => (
                      <button
                        key={b.id}
                        onClick={() => { setActiveBranch(b.id, b.name); setIsOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Store size={14} className="text-indigo-500" />
                          {b.name}
                        </span>
                        {activeBranchId === b.id && <Check size={14} className="text-indigo-600 stroke-[3]" />}
                      </button>
                    ))
                ) : salonName ? (
                  <button
                    onClick={() => { setActiveBranch(null, null); setIsOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Store size={14} className="text-indigo-500" />
                      <span>{salonName}</span>
                      <span className="text-[10px] font-normal text-slate-400">Main</span>
                    </span>
                    {activeBranchId === null && <Check size={14} className="text-indigo-600 stroke-[3]" />}
                  </button>
                ) : (
                  <p className="text-xs text-slate-400 px-4 py-2 italic">
                    No active branches found.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4 relative">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg relative transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 bg-indigo-600 w-2 h-2 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-12 mt-2 w-80 md:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xl z-30 py-4 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => clearAllNotifications(notifications.map(n => n.id))}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[350px]">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className="p-4 hover:bg-slate-50/50 flex gap-3 items-start transition-colors relative group">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          n.type === 'danger' ? 'bg-rose-50 text-rose-600' :
                          n.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          {n.icon === 'calendar' && <Calendar size={16} />}
                          {n.icon === 'clock' && <Clock size={16} />}
                          {n.icon === 'alert' && <AlertTriangle size={16} />}
                          {n.icon === 'sparkles' && <Sparkles size={16} />}
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-bold text-slate-900">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.description}</p>
                          <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">{n.time}</span>
                        </div>
                        <button 
                          onClick={() => dismissNotification(n.id)}
                          className="absolute right-3 top-3 text-slate-300 hover:text-slate-500 p-1 rounded-md hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                          title="Dismiss"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 px-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                        <Bell size={20} className="text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-600">All caught up!</p>
                      <p className="text-[10px] text-slate-400 mt-1">No new notifications at the moment.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <button className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
              {user?.name?.[0] || "U"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-none">{user?.name}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{user?.role}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
      </div>
      </div>
    </header>
  );
};
