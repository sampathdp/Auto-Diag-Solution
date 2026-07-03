import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';

interface PaymentBlockModalProps {
  onSuccess?: () => void;
  initialPending?: boolean;
}

export const PaymentBlockModal: React.FC<PaymentBlockModalProps> = ({
  onSuccess,
  initialPending = false,
}) => {
  const [file, setFile]             = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(initialPending);
  const [bankDetails, setBankDetails] = useState<Record<string, string>>({});
  const [loadingBank, setLoadingBank]  = useState(true);
  const [planInfo, setPlanInfo]        = useState<{ id: number; name: string; monthly_price: number } | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    // Fetch bank details
    apiClient.get('/system-settings/bank-details')
      .then(res => setBankDetails(res.data?.data || {}))
      .catch(() => {})
      .finally(() => setLoadingBank(false));

    // Fetch current salon subscription to know the plan and amount
    apiClient.get('/settings')
      .then(res => {
        const salon = res.data?.data;
        if (salon?.plan_id && salon?.plan_name) {
          setPlanInfo({
            id: salon.plan_id,
            name: salon.plan_name,
            monthly_price: Number(salon.plan_monthly_price || 0),
          });
        }
      })
      .catch(() => {});
  }, []);

  const payableAmount = (): number => {
    if (!planInfo) return 0;
    if (billingCycle === 'yearly') {
      return planInfo.monthly_price * 12 * 0.8;
    }
    return planInfo.monthly_price;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a payment slip to upload.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('slip', file);
      formData.append('amount', String(payableAmount()));
      formData.append('billing_cycle', billingCycle);
      if (planInfo?.id) {
        formData.append('plan_id', String(planInfo.id));
      }

      await apiClient.post('/payments/upload', formData);
      setIsSubmitted(true);
      toast.success('Payment slip uploaded successfully!');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload payment slip.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">

        {/* Header */}
        <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-red-900">Subscription Expired</h2>
          <p className="text-red-700 mt-2 text-sm font-medium">
            Your grace period has ended and your salon access has been temporarily suspended.
            Please make a payment to restore access.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center flex flex-col items-center">
            <CheckCircle size={48} className="text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Payment Pending Approval</h3>
            <p className="text-slate-500 mt-2 text-sm">
              Your payment slip has been submitted and is under review. Once verified, your
              access will be automatically restored (usually within 24 hours).
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all"
            >
              <RefreshCw size={18} />
              Check Status
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Plan & Billing cycle */}
            {planInfo && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Renewing Plan</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 capitalize">{planInfo.name}</span>
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-indigo-200 p-0.5">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Annual <span className={`text-[9px] font-black ${billingCycle === 'yearly' ? 'text-indigo-200' : 'text-emerald-600'}`}>-20%</span>
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-black text-indigo-600 mt-2">
                  LKR {payableAmount().toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </p>
              </div>
            )}

            {/* Bank Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Bank Transfer Details</h3>
              {loadingBank ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-slate-500 text-xs mb-0.5">Bank</span>
                    <span className="font-semibold text-slate-900">{bankDetails.bank_name || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xs mb-0.5">Branch</span>
                    <span className="font-semibold text-slate-900">{bankDetails.bank_branch || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-500 text-xs mb-0.5">Account Name</span>
                    <span className="font-semibold text-slate-900">{bankDetails.bank_account_name || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-500 text-xs mb-0.5">Account Number</span>
                    <code className="text-lg font-black text-indigo-600 tracking-widest">
                      {bankDetails.bank_account_no || '—'}
                    </code>
                  </div>
                  {bankDetails.bank_instructions && (
                    <div className="col-span-2 text-xs text-slate-500 border-t border-slate-200 pt-2 mt-1">
                      {bankDetails.bank_instructions}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload Section */}
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Upload Payment Slip</h3>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50">
                <input
                  type="file"
                  id="payment-slip"
                  className="hidden"
                  accept="image/png, image/jpeg, application/pdf"
                  onChange={e => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                />
                <label htmlFor="payment-slip" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud size={32} className={file ? 'text-indigo-500' : 'text-slate-400'} />
                  <span className="mt-3 text-sm font-semibold text-slate-700">
                    {file ? file.name : 'Click to upload your bank slip'}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">PNG, JPG or PDF (max 5MB)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="px-4 py-2 text-slate-600 font-semibold hover:text-slate-900 transition-colors text-sm"
              >
                Logout
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : 'Submit Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
