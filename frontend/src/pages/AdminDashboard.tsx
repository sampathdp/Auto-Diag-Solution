import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Building2, Clock, DollarSign, ArrowRight, ShieldCheck, MessageSquare, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { format } from "date-fns";

const AdminDashboard = () => {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/stats');
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const displayStats = [
    {
      title: "Total Salons",
      value: stats?.total_salons ?? 0,
      icon: Building2,
      color: "indigo" as const,
      href: "/salons",
    },
    {
      title: "Active Subscriptions",
      value: stats?.active_subscriptions ?? 0,
      icon: ShieldCheck,
      color: "emerald" as const,
    },
    {
      title: "Pending Requests",
      value: stats?.pending_requests ?? 0,
      icon: Clock,
      color: "amber" as const,
      href: "/admin/trials",
    },
    {
      title: "Platform Revenue",
      value: stats?.formatted_revenue ?? "LKR 0",
      icon: DollarSign,
      color: "blue" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Super Admin Control Center" 
        description="Monitor platform growth, manage salon entities, and oversee trial applications."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trial Applications */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Trial Applications</h3>
              <p className="text-sm text-slate-500">Review new salon requests waiting for approval.</p>
            </div>
            <Link to="/admin/trials">
              <Button variant="secondary" size="sm">
                View All <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>

          {stats?.recent_trials && stats.recent_trials.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {stats.recent_trials.map((trial: any) => (
                <li key={trial.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{trial.salon_name}</p>
                    <p className="text-xs text-slate-500">{trial.owner_name} · {trial.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      trial.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      trial.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      trial.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-slate-50 text-slate-700'
                    }`}>
                      {trial.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start space-x-3">
              <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold text-emerald-900">All caught up!</p>
                <p className="text-xs text-emerald-700 mt-1">No pending trial requests at the moment.</p>
              </div>
            </div>
          )}
        </div>

        {/* Salon Management */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Salon Management</h3>
              <p className="text-sm text-slate-500">Configure salon settings and monitor tenant status.</p>
            </div>
            <Link to="/salons">
              <Button variant="secondary" size="sm">
                Manage Salons <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start space-x-3">
            <Building2 className="text-indigo-600 shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-indigo-900">{stats?.total_salons ?? 0} Registered Salons</p>
              <p className="text-xs text-indigo-700 mt-1">
                {stats?.total_users ?? 0} total users across the platform.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Inquiries */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Contact Inquiries</h3>
              <p className="text-sm text-slate-500">Read messages submitted from the public contact form.</p>
            </div>
            <Link to="/admin/messages">
              <Button variant="secondary" size="sm">
                View Messages <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>

          {stats?.recent_messages && stats.recent_messages.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {stats.recent_messages.slice(0, 3).map((msg: any) => (
                <li key={msg.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-semibold text-slate-900 truncate">{msg.name}</p>
                    <p className="text-xs text-slate-500 truncate">{msg.subject || 'No Subject'}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    msg.status === 'pending' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {msg.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start space-x-3">
              <MessageSquare className="text-purple-600 shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold text-purple-900">Inbox empty</p>
                <p className="text-xs text-purple-700 mt-1">No contact messages yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
