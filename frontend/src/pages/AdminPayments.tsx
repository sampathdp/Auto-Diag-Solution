import React, { useState } from 'react';
import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import apiClient from '@/api/client';
import {
  CreditCard, Check, X, Search, FileText, AlertTriangle,
  Clock, ChevronDown, ChevronUp, History, CalendarPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const AdminPayments = () => {
  const [searchTerm, setSearchTerm]             = useState('');
  const [selectedPayment, setSelectedPayment]   = useState<any>(null);
  const [rejectReason, setRejectReason]         = useState('');
  const [showRejectInput, setShowRejectInput]   = useState(false);
  const [extendTarget, setExtendTarget]         = useState<any>(null);
  const [extendDays, setExtendDays]             = useState(7);
  const [extendReason, setExtendReason]         = useState('');
  const [auditSalonId, setAuditSalonId]         = useState<number | null>(null);

  const { data, isLoading, refetch } = useApiQuery(['admin-payments'], '/admin/salon-payments');
  const payments = data?.data?.payments || [];

  const { data: auditData } = useApiQuery(
    ['audit-log', auditSalonId],
    `/admin/subscriptions/${auditSalonId ?? 0}/audit-log`,
    { enabled: !!auditSalonId }
  );

  const filteredPayments = payments.filter((p: any) =>
    p.salon_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approveMutation = useApiMutation(
    (id: number) => apiClient.post(`/admin/salon-payments/${id}/approve`),
    'Payment approved! Subscription extended.',
    [['admin-payments']]
  );

  const rejectMutation = useApiMutation(
    ({ id, reason }: { id: number; reason: string }) =>
      apiClient.post(`/admin/salon-payments/${id}/reject`, { reason }),
    'Payment rejected. Salon owner notified.',
    [['admin-payments']]
  );

  const extendMutation = useApiMutation(
    ({ salonId, days, reason }: { salonId: number; days: number; reason: string }) =>
      apiClient.post(`/admin/subscriptions/${salonId}/extend`, { days, reason }),
    'Trial/subscription extended.',
    [['admin-payments']]
  );

  const handleReject = () => {
    if (!selectedPayment) return;
    rejectMutation.mutate(
      { id: selectedPayment.id, reason: rejectReason },
      {
        onSuccess: () => {
          setSelectedPayment(null);
          setRejectReason('');
          setShowRejectInput(false);
        },
      }
    );
  };

  const handleExtend = () => {
    if (!extendTarget) return;
    extendMutation.mutate(
      { salonId: extendTarget.salon_id, days: extendDays, reason: extendReason },
      {
        onSuccess: () => {
          setExtendTarget(null);
          setExtendDays(7);
          setExtendReason('');
          refetch();
        },
      }
    );
  };

  const slipUrl = (slipPath: string) => {
    if (!slipPath) return '';
    if (slipPath.startsWith('http')) return slipPath;
    // Convert /uploads/type/file.jpg → /api/v1/storage/type/file.jpg
    const match = slipPath.match(/\/uploads\/([^/]+)\/([^/]+)$/);
    if (match) return `${API_ROOT}/storage/${match[1]}/${match[2]}`;
    return slipPath;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="text-indigo-600" /> Salon Payments
          </h1>
          <p className="text-slate-500">Verify bank transfer slips and manage salon subscriptions.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by salon name or email..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Salon</th>
                <th className="p-4 font-semibold">Plan</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Billing</th>
                <th className="p-4 font-semibold">Submitted</th>
                <th className="p-4 font-semibold">Coverage</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">No payment records found.</td>
                </tr>
              ) : (
                filteredPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{p.salon_name}</div>
                      <div className="text-xs text-slate-500">{p.email}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Sub expires: {p.expires_at ? format(new Date(p.expires_at), 'MMM d, yyyy') : '—'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-700">{p.plan_name || 'N/A'}</span>
                    </td>
                    <td className="p-4 font-semibold">
                      {p.amount ? `LKR ${Number(p.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        p.billing_cycle === 'yearly'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.billing_cycle || 'monthly'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      {format(new Date(p.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="p-4">
                      {p.coverage_start && p.coverage_end ? (
                        <div className="text-xs text-slate-500 font-medium">
                          {format(new Date(p.coverage_start), 'MMM d, yyyy')}
                          <br />→ {format(new Date(p.coverage_end), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                        p.status === 'pending'  ? 'bg-amber-100 text-amber-700'   :
                        p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                  'bg-red-100 text-red-700'
                      }`}>
                        {p.status === 'pending' && <Clock size={11} className="inline mr-1" />}
                        {p.status === 'approved' && <Check size={11} className="inline mr-1" />}
                        {p.status === 'rejected' && <AlertTriangle size={11} className="inline mr-1" />}
                        {p.status}
                      </span>
                      {p.status === 'rejected' && p.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1 max-w-[160px] truncate" title={p.rejection_reason}>
                          {p.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <FileText size={14} /> Slip
                        </button>
                        <button
                          onClick={() => setExtendTarget(p)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                          title="Extend trial or subscription"
                        >
                          <CalendarPlus size={14} />
                        </button>
                        <button
                          onClick={() => setAuditSalonId(auditSalonId === p.salon_id ? null : p.salon_id)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                          title="View audit log"
                        >
                          <History size={14} />
                          {auditSalonId === p.salon_id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Audit Log Drawer */}
      {auditSalonId && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <History size={16} className="text-slate-500" />
            Subscription Audit Log — Salon #{auditSalonId}
          </h3>
          {!auditData ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : (auditData?.data?.log || []).length === 0 ? (
            <p className="text-slate-400 text-sm">No audit records yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(auditData?.data?.log || []).map((entry: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm border-b border-slate-100 pb-2">
                  <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold uppercase shrink-0 ${
                    entry.event_type.includes('approved') ? 'bg-emerald-100 text-emerald-700' :
                    entry.event_type.includes('rejected') ? 'bg-red-100 text-red-700' :
                    entry.event_type.includes('expired')  ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{entry.event_type}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-600 text-xs truncate">{entry.notes || '—'}</p>
                    {entry.new_expires_at && (
                      <p className="text-slate-400 text-xs">
                        → Expires: {format(new Date(entry.new_expires_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {format(new Date(entry.created_at), 'MMM d HH:mm')}
                    {entry.created_by_name && ` · ${entry.created_by_name}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slip Viewer Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Payment Slip — {selectedPayment.salon_name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPayment.plan_name} ·{' '}
                  <span className="font-semibold">LKR {Number(selectedPayment.amount).toLocaleString()}</span> ·{' '}
                  <span className="capitalize">{selectedPayment.billing_cycle || 'monthly'}</span>
                </p>
              </div>
              <button
                onClick={() => { setSelectedPayment(null); setShowRejectInput(false); setRejectReason(''); }}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-50 flex items-center justify-center">
              {selectedPayment.slip_url?.endsWith('.pdf') ? (
                <iframe
                  src={slipUrl(selectedPayment.slip_url)}
                  className="w-full h-[60vh] rounded-lg border border-slate-200"
                  title="Payment PDF"
                />
              ) : (
                <img
                  src={slipUrl(selectedPayment.slip_url)}
                  alt="Payment slip"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-200 shadow-sm"
                  onError={(e: any) => { e.target.src = 'https://placehold.co/600x400?text=Image+Not+Found'; }}
                />
              )}
            </div>

            {selectedPayment.status === 'pending' && (
              <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl space-y-3">
                {showRejectInput && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      Rejection reason (will be emailed to salon owner)
                    </label>
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Amount does not match, wrong account number..."
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  {!showRejectInput ? (
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="px-5 py-2 text-red-600 font-semibold hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Reject Payment
                    </button>
                  ) : (
                    <button
                      onClick={handleReject}
                      disabled={rejectMutation.isPending}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
                    >
                      {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                  )}
                  <button
                    onClick={() => approveMutation.mutate(selectedPayment.id, { onSuccess: () => setSelectedPayment(null) })}
                    disabled={approveMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-60"
                  >
                    <Check size={18} /> {approveMutation.isPending ? 'Approving...' : 'Approve & Extend'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extend Trial / Subscription Modal */}
      {extendTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Extend Subscription</h2>
                <p className="text-sm text-slate-500">{extendTarget.salon_name}</p>
              </div>
              <button onClick={() => setExtendTarget(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Extend by (days)</label>
                <div className="flex items-center gap-2">
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => setExtendDays(d)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        extendDays === d
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={extendDays}
                    onChange={e => setExtendDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                    className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Reason (for audit log)</label>
                <input
                  type="text"
                  value={extendReason}
                  onChange={e => setExtendReason(e.target.value)}
                  placeholder="e.g. Customer support courtesy extension"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setExtendTarget(null)} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold">Cancel</button>
                <button
                  onClick={handleExtend}
                  disabled={extendMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-60"
                >
                  <CalendarPlus size={16} />
                  {extendMutation.isPending ? 'Extending...' : `Extend ${extendDays} Days`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
