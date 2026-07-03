import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  Users,
  Calendar,
  Scissors,
  DollarSign,
  TrendingUp,
  Clock,
  Copy,
  ExternalLink,
  X,
  CheckCircle2,
  BarChart2,
  AlertTriangle,
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { useAuthStore } from "@/store/useAuthStore";
import { Navigate, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import apiClient from "@/api/client";
import { toast } from "react-hot-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useApiQuery } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

const COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#f43f5e", "#10b981"];

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const [salonSlug, setSalonSlug] = useState(user?.salon_slug);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);

  // Trial card dismiss – persisted per session so it comes back on reload
  const dismissKey = `trial_card_dismissed_v2_${user?.salon_id}`;
  const [trialDismissed, setTrialDismissed] = useState(
    () => sessionStorage.getItem(dismissKey) === "true"
  );

  const expiryDismissKey = `expiry_banner_dismissed_v2_${user?.salon_id}`;
  const [expiryDismissed, setExpiryDismissed] = useState(
    () => sessionStorage.getItem(expiryDismissKey) === "true"
  );

  const handleDismissTrial = () => {
    sessionStorage.setItem(dismissKey, "true");
    setTrialDismissed(true);
  };

  const handleDismissExpiry = () => {
    sessionStorage.setItem(expiryDismissKey, "true");
    setExpiryDismissed(true);
  };

  const { data: dashboardData, isLoading: isStatsLoading, error } = useApiQuery<any>(
    ["dashboard-stats", activeBranchId],
    `/dashboard/stats${activeBranchId ? `?branch_id=${activeBranchId}` : ""}`
  );

  useEffect(() => {
    if (!salonSlug && user?.salon_id) {
      apiClient
        .get(`/salons/${user.salon_id}`)
        .then((res) => {
          setSalonSlug(res.data.data.slug);
        })
        .catch(() => {});
    }
  }, [user?.salon_id, salonSlug]);

  useEffect(() => {
    if (user?.salon_slug) setSalonSlug(user.salon_slug);
  }, [user?.salon_slug]);

  if (user?.role?.toLowerCase() === "super_admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const statsData = dashboardData?.data?.stats;
  const recentData = dashboardData?.data?.recent_appointments;

  // ── Revenue / Bookings chart data (real from backend) ──────────────────────
  const chartData = useMemo(() => {
    const history: any[] = dashboardData?.data?.revenue_history || [];
    if (history.length > 0) {
      return history.map((row: any) => ({
        name: row.month_label,
        Revenue: Number(row.revenue) || 0,
        Bookings: Number(row.bookings) || 0,
      }));
    }
    // Fallback: build 6-month skeleton with current month revenue
    const months: string[] = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push(d.toLocaleString("en-US", { month: "short" }));
    }
    return months.map((m, idx) => ({
      name: m,
      Revenue: idx === months.length - 1 ? Number(statsData?.monthly_revenue) || 0 : 0,
      Bookings: 0,
    }));
  }, [dashboardData?.data?.revenue_history, statsData?.monthly_revenue]);

  // ── Popular Services pie (real from backend) ────────────────────────────────
  const pieData = useMemo(() => {
    const services: any[] = dashboardData?.data?.popular_services || [];
    if (services.length > 0) {
      const total = services.reduce((sum: number, s: any) => sum + Number(s.booking_count), 0);
      return services.map((s: any) => ({
        name: s.name,
        value: total > 0 ? Math.round((Number(s.booking_count) / total) * 100) : 0,
      }));
    }
    return null; // no data yet
  }, [dashboardData?.data?.popular_services]);

  const stats = [
    {
      title: "Today's Appointments",
      value: statsData?.appointments_today?.toString() || "0",
      icon: Calendar,
      trend: { value: 0, isUp: true },
      color: "indigo",
      href: "/appointments",
    },
    {
      title: "Active Customers",
      value: statsData?.active_customers?.toString() || "0",
      icon: Users,
      trend: { value: 0, isUp: true },
      color: "blue",
      href: "/customers",
    },
    {
      title: "Total Services",
      value: statsData?.total_services?.toString() || "0",
      icon: Scissors,
      trend: { value: 0, isUp: true },
      color: "emerald",
      href: "/services",
    },
    {
      title: "Monthly Revenue",
      value: `LKR ${(statsData?.monthly_revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: { value: 0, isUp: true },
      color: "amber",
      href: "/billing",
    },
  ] as const;

  const columns = [
    { header: "Customer", accessor: "customer" as const },
    { header: "Service", accessor: "service_name" as const },
    {
      header: "Time",
      accessor: (item: any) => (
        <div className="flex items-center text-slate-500">
          <Clock size={14} className="mr-1" />
          {item.time}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item: any) => (
        <span
          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            item.status === "confirmed" || item.status === "completed"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  const subscription = dashboardData?.data?.subscription;
  const isTrial = subscription?.status === "trial";
  const isActive = subscription?.status === "active";
  const expiresAt = subscription?.expires_at;

  const getDaysLeft = () => {
    if (!expiresAt) return 0;
    const cleanExpiresAt = expiresAt.includes(" ")
      ? expiresAt.replace(" ", "T")
      : expiresAt;
    const diffTime =
      new Date(cleanExpiresAt).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysLeft = getDaysLeft();
  const isExpirySoon = daysLeft <= 7;
  const growthRate = dashboardData?.data?.growth_rate ?? 0;
  const completionRate = statsData?.completion_rate ?? 0;
  const avgTicket = statsData?.avg_ticket ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome back, Admin"
        description="Here's what's happening at your salon today."
      />

      {/* ── Trial & Grace Period Banner ──────────────────────────────────── */}
      {subscription && subscription.is_in_grace_period && (
        <div className="bg-gradient-to-r from-red-500/10 via-red-600/5 to-transparent border border-red-500/30 rounded-[2rem] p-6 relative overflow-hidden backdrop-blur-sm mb-8 animate-pulse">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <AlertTriangle size={120} className="text-red-500 -rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-red-500 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg shadow-red-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                PAYMENT OVERDUE
              </span>
              <span className="text-sm font-bold text-red-900/60 uppercase tracking-widest">
                System Lock Imminent
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-2">
              Your system access will be blocked soon!
            </h3>
            <p className="text-slate-600 text-sm font-medium max-w-2xl leading-relaxed mb-5">
              Your trial has ended and you are currently in the grace period. Please upload your payment slip immediately to prevent losing access to your POS, bookings, and salon data.
            </p>
            <div className="flex gap-4">
              <Link
                to="/settings"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                UPLOAD PAYMENT SLIP
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Subscription Expiry Banner ──────────────────────────────────── */}
      {isActive && !expiryDismissed && (
        <div className={cn(
          "border rounded-[2rem] p-6 relative overflow-hidden backdrop-blur-sm",
          isExpirySoon 
            ? "bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border-amber-500/20"
            : "bg-gradient-to-r from-indigo-500/10 via-indigo-600/5 to-transparent border-indigo-500/20"
        )}>
          <button
            onClick={handleDismissExpiry}
            className={cn(
              "absolute top-4 right-4 z-20 p-1.5 rounded-full transition-colors",
              isExpirySoon ? "hover:bg-amber-100 text-slate-400 hover:text-slate-600" : "hover:bg-indigo-100 text-slate-400 hover:text-indigo-600"
            )}
            title="Dismiss"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10 pr-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isExpirySoon ? "bg-amber-500 animate-pulse" : "bg-indigo-500"
                )} />
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                  isExpirySoon 
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-indigo-100 text-indigo-800 border-indigo-200"
                )}>
                  Active Plan
                </span>
                <span className="text-slate-400 text-xs font-bold">
                  Current Package:{" "}
                  <strong className="text-slate-800 font-extrabold uppercase">
                    {subscription?.plan_name}
                  </strong>
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {isExpirySoon ? (
                  <>
                    Heads up! Your plan will expire in{" "}
                    <span className="text-amber-600 font-black">
                      {daysLeft} {daysLeft === 1 ? "day" : "days"}
                    </span>
                  </>
                ) : (
                  <>
                    Your subscription is active until{" "}
                    <span className="text-indigo-600 font-black">
                      {new Date(expiresAt.includes(' ') ? expiresAt.replace(' ', 'T') : expiresAt).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </>
                )}
              </h3>

              {isExpirySoon && (
                <p className="text-slate-600 text-xs max-w-3xl leading-relaxed">
                  To avoid any interruption in your POS, bookings, and salon management, please ensure you upload your payment slip for the upcoming period before the expiration date.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 min-w-[200px] w-full lg:w-auto">
              <Link
                to="/settings"
                className={cn(
                  "text-center py-2.5 px-6 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all",
                  isExpirySoon
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25"
                )}
              >
                {isExpirySoon ? "Renew Plan Now" : "Manage Subscription"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {isTrial && !trialDismissed && !subscription?.is_in_grace_period && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 rounded-[2rem] p-6 relative overflow-hidden backdrop-blur-sm">
          {/* Dismiss button */}
          <button
            onClick={handleDismissTrial}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-full hover:bg-amber-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10 pr-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-200">
                  Free Trial Active
                </span>
                <span className="text-slate-400 text-xs font-bold">
                  Selected Package:{" "}
                  <strong className="text-slate-800 font-extrabold uppercase">
                    {subscription?.plan_name}
                  </strong>
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Your trial will expire in{" "}
                <span className="text-amber-600 font-black">
                  {daysLeft} {daysLeft === 1 ? "day" : "days"}
                </span>
              </h3>

              <p className="text-slate-600 text-xs max-w-3xl leading-relaxed">
                🎉 <strong>Trial Benefit:</strong> You currently have access to{" "}
                <strong className="text-indigo-600">all features</strong>{" "}
                (including POS billing, SMS notification gateway, inventory
                control, and multi-branch management).
              </p>

              <div className="pt-3.5 text-slate-500 text-[11px] font-medium border-t border-slate-200/50 mt-2">
                🔒 <strong>Post-Trial Plan Limits:</strong> Once your trial
                ends, your system will be restricted to the{" "}
                <strong className="text-slate-700 font-bold uppercase">
                  {subscription?.plan_name}{" "}
                </strong>{" "}
                plan features:
                <span className="text-slate-600 font-semibold block mt-1">
                  {subscription?.plan_name?.toLowerCase() === "starter" &&
                    "• 1 staff member • 1 branch location • Minimal theme (no POS billing, no inventory, no SMS notifications)."}
                  {subscription?.plan_name?.toLowerCase() === "professional" &&
                    "• Up to 5 staff members • Up to 3 branch locations • 3 themes • POS billing, inventory management, and SMS gateway integration."}
                  {subscription?.plan_name?.toLowerCase() === "enterprise" &&
                    "• Unlimited staff members • Unlimited branch locations • All themes • POS billing, inventory, SMS integration, and priority support."}
                </span>
              </div>
            </div>

            <Link to="/settings" className="shrink-0 w-full lg:w-auto">
              <button className="w-full lg:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all hover:scale-105 shadow-md shadow-slate-900/10">
                Upgrade Plan
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* ── Recent Appointments (moved to top) ───────────────────────────── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-indigo-500" />
              Recent Appointments
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Latest bookings across your salon
            </p>
          </div>
          <Link
            to="/appointments"
            className="text-sm text-indigo-600 font-semibold hover:underline"
          >
            View all →
          </Link>
        </div>
        <DataTable
          columns={columns}
          data={recentData || []}
          isLoading={isStatsLoading}
          emptyMessage="No recent appointments found."
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-500" />
              Revenue &amp; Bookings Trend
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Monthly breakdown of completed earnings and booking volume.
            </p>
          </div>
          <div className="h-72 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorRevenue"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#6366f1"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="#6366f1"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `LKR ${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                  }}
                  formatter={(value: any) => [
                    `LKR ${Number(value).toLocaleString()}`,
                    "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Services Pie Chart */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Popular Services
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Most requested services by booking count.
            </p>
          </div>
          <div className="h-72 w-full flex items-center justify-center mt-6">
            {pieData && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                    }}
                    formatter={(value: any) => [`${value}%`, "Share"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <Scissors size={36} className="text-slate-200" />
                <p className="text-sm font-semibold text-slate-400">
                  No service data yet
                </p>
                <p className="text-xs text-slate-300">
                  Complete appointments to see your top services
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Performance Overview ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-5">
          Performance Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Growth Rate */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Growth Rate</p>
              <p className="text-sm font-bold text-slate-900">
                {growthRate >= 0 ? "+" : ""}
                {growthRate}% vs last month
              </p>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Completion Rate
              </p>
              <p className="text-sm font-bold text-slate-900">
                {completionRate > 0 ? `${completionRate}% completed` : "No data yet"}
              </p>
            </div>
          </div>

          {/* Avg Ticket */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Avg. Ticket Size
              </p>
              <p className="text-sm font-bold text-slate-900">
                {avgTicket > 0
                  ? `LKR ${Number(avgTicket).toLocaleString()}`
                  : "No data yet"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
