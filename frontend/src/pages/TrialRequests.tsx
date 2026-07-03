import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { useApiList, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { Check, X, Mail, Phone, Copy, Key, Filter, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/utils";

const TrialRequests = () => {
  const [credentials, setCredentials] = useState<{ email: string; password: string; salon_name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [confirmState, setConfirmState] = useState<{ id: number; type: 'reject' | 'activate' } | null>(null);

  const { data: requests, isLoading } = useApiList(['admin', 'trial-requests', activeTab], async () => {
    const { data } = await apiClient.get(`/admin/trial-requests?status=${activeTab}`);
    return data.data;
  });

  const { mutate: approve, isPending: isApproving } = useApiMutation(
    (id: number) => apiClient.post(`/admin/trial-requests/${id}/approve`),
    "Request approved and account created!",
    [['admin', 'trial-requests']]
  );

  const { mutate: reject, isPending: isRejecting } = useApiMutation(
    (id: number) => apiClient.post(`/admin/trial-requests/${id}/reject`),
    "Request rejected.",
    [['admin', 'trial-requests']]
  );

  const { mutate: activate, isPending: isActivating } = useApiMutation(
    (id: number) => apiClient.post(`/admin/trial-requests/${id}/activate`),
    "Trial activated successfully!",
    [['admin', 'trial-requests']]
  );

  const handleApprove = (id: number) => {
    approve(id, {
      onSuccess: (response: any) => {
        setCredentials(response.data.data);
      }
    });
  };

  const handleReject = (id: number) => {
    setConfirmState({ id, type: 'reject' });
  };

  const handleActivate = (id: number) => {
    setConfirmState({ id, type: 'activate' });
  };

  const executeConfirm = () => {
    if (!confirmState) return;

    if (confirmState.type === 'reject') {
      reject(confirmState.id, { onSuccess: () => setConfirmState(null) });
    } else {
      activate(confirmState.id, { onSuccess: () => setConfirmState(null) });
    }
  };

  const columns = [
    { header: "Salon Name", accessor: "salon_name" as const, className: "font-bold text-slate-900" },
    { header: "Owner", accessor: "owner_name" as const },
    { header: "Contact", accessor: (item: any) => (
      <div className="space-y-1">
        <div className="flex items-center text-xs text-slate-500"><Mail size={12} className="mr-1" /> {item.email}</div>
        <div className="flex items-center text-xs text-slate-500"><Phone size={12} className="mr-1" /> {item.phone}</div>
      </div>
    )},
    { header: "Staff", accessor: (item: any) => (
      <span className="text-xs font-bold text-slate-700">{item.number_of_staff}</span>
    )},
    { header: "Branches", accessor: (item: any) => (
      <span className="text-xs font-bold text-slate-700">{item.number_of_branches}</span>
    )},
    { header: "Plan", accessor: (item: any) => (
      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[11px] font-bold">
        {item.plan_display_name || item.selected_plan}
      </span>
    )},
    { header: "Status", accessor: (item: any) => (
      <div className="space-y-1">
        <div className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider",
          item.status === 'pending' && "bg-amber-100 text-amber-700",
          item.status === 'approved' && "bg-emerald-100 text-emerald-700",
          item.status === 'rejected' && "bg-rose-100 text-rose-700"
        )}>
          {item.status === 'pending' && <Clock size={12} className="mr-1.5" />}
          {item.status === 'approved' && <CheckCircle size={12} className="mr-1.5" />}
          {item.status === 'rejected' && <XCircle size={12} className="mr-1.5" />}
          {item.status}
        </div>
        {item.activation_started_at && (
          <div className="text-[10px] text-slate-500 font-bold flex items-center">
            <Calendar size={10} className="mr-1" /> Started: {new Date(item.activation_started_at.includes(' ') ? item.activation_started_at.replace(' ', 'T') : item.activation_started_at).toLocaleDateString()}
          </div>
        )}
      </div>
    )},
    { header: "Actions", accessor: (item: any) => (
      <div className="flex items-center space-x-2">
        {item.status === 'pending' && (
          <>
            <Button 
              size="sm" 
              onClick={() => handleApprove(item.id)} 
              loading={isApproving}
              className="h-8 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check size={14} className="mr-1" /> Approve
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => handleReject(item.id)}
              loading={isRejecting}
            >
              <X size={14} className="mr-1" /> Reject
            </Button>
          </>
        )}
        
        {item.status === 'approved' && !item.activation_started_at && (
          <Button 
            size="sm" 
            onClick={() => handleActivate(item.id)} 
            loading={isActivating}
            className="h-8 bg-indigo-600 hover:bg-indigo-700"
          >
            <Calendar size={14} className="mr-1" /> Start Trial
          </Button>
        )}

        {item.status === 'approved' && item.activation_started_at && (
          <span className="text-xs text-emerald-600 font-bold">Trial Active</span>
        )}

        {item.status === 'rejected' && (
          <span className="text-xs text-slate-400 italic">Rejected</span>
        )}
      </div>
    )},
  ];

  const tabs = [
    { id: 'pending', label: 'Pending Requests', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Trial Requests" 
        description="Review and approve new salon trial applications."
      />

      <div className="flex items-center space-x-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300",
              activeTab === tab.id 
                ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={16} className={cn("mr-2", activeTab === tab.id ? tab.color : "text-slate-400")} />
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable 
        columns={columns} 
        data={requests || []} 
        isLoading={isLoading}
        emptyMessage={`No ${activeTab} trial requests found.`}
      />

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={executeConfirm}
        title={confirmState?.type === 'reject' ? "Reject Request?" : "Start Trial?"}
        description={confirmState?.type === 'reject' 
          ? "Are you sure you want to reject this salon trial request? This action cannot be undone." 
          : "This will start the 14-day countdown for this salon. Are you ready?"}
        confirmText={confirmState?.type === 'reject' ? "Reject" : "Start Now"}
        variant={confirmState?.type === 'reject' ? "danger" : "primary"}
        loading={isRejecting || isActivating}
      />

      <Modal
        isOpen={!!credentials}
        onClose={() => setCredentials(null)}
        title="Salon Trial Approved!"
        description="The account has been created successfully. Please copy these credentials and share them with the owner."
      >
        <div className="space-y-6 py-4">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start space-x-3">
            <div className="bg-emerald-500 text-white p-2 rounded-lg">
              <Check size={20} />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">Salon: {credentials?.salon_name}</h4>
              <p className="text-emerald-700 text-xs">The salon has been activated and a 14-day trial has started.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Owner Email</p>
                <p className="text-sm font-bold text-slate-900">{credentials?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => navigator.clipboard.writeText(credentials?.email || "")}
              >
                <Copy size={14} className="text-slate-400" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Generated Password</p>
                <p className="text-sm font-mono font-bold text-slate-900">{credentials?.password}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => navigator.clipboard.writeText(credentials?.password || "")}
              >
                <Copy size={14} className="text-slate-400" />
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button 
              className="w-full h-12 bg-slate-900"
              onClick={() => setCredentials(null)}
            >
              Done, I have shared the credentials
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TrialRequests;
