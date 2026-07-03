import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ShieldCheck,
  Check,
  Zap,
  Building2,
  Upload,
  History,
  FileText,
  Clock,
  XCircle,
  AlertCircle,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import apiClient from "@/api/client";

const API_ROOT = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const toStorageUrl = (path: string) => {
  if (!path || path.startsWith('http')) return path;
  const match = path.match(/\/uploads\/([^/]+)\/([^/]+)$/);
  return match ? `${API_ROOT}/storage/${match[1]}/${match[2]}` : path;
};
import { DataTable } from "@/components/ui/DataTable";

interface SubscriptionSettingsProps {
  salonData: any;
}

export const SubscriptionSettings = ({ salonData }: SubscriptionSettingsProps) => {
  const { upgradeSubscription, listPackages } = useSettings();
  const { mutate: doUpgrade, isPending } = upgradeSubscription();
  const { data: dbPlans, isLoading: isLoadingPlans } = listPackages();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"bank">("bank");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const currentPlanName = salonData?.plan_name || "starter";

  const discountPercent = Number(salonData?.discount_percent || 0);
  const discountExpiresAt = salonData?.discount_expires_at || null;
  const hasActiveDiscount =
    discountPercent > 0 && (!discountExpiresAt || new Date(discountExpiresAt) >= new Date());
  const applyDiscount = (price: number) =>
    hasActiveDiscount ? Math.round((price * (1 - discountPercent / 100)) * 100) / 100 : price;

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useApiQuery<any>(
    ['payment-history'],
    '/payments/history'
  );

  const { data: bankData } = useApiQuery<any>(['bank-details'], '/system-settings/bank-details');
  const bankDetails = bankData?.data || {};

  const { mutate: uploadSlip, isPending: isUploading } = useApiMutation(
    (formData: FormData) => apiClient.post('/payments/upload', formData),
    "Payment slip uploaded successfully!"
  );
  const currentPlanStatus = salonData?.sub_status || "trial";

  // Filter out 'free' plan from the user upgrade panel
  const displayPlans = (dbPlans || []).filter(
    (p: any) => p.name.toLowerCase() !== "free"
  );

  const getPlanStyles = (name: string) => {
    switch (name.toLowerCase()) {
      case "starter":
        return {
          icon: Zap,
          color: "from-blue-500 to-indigo-600",
          bgAccent: "bg-blue-50/50 border-blue-100",
          badgeColor: "bg-blue-100 text-blue-800",
          recommended: false,
        };
      case "professional":
        return {
          icon: Sparkles,
          color: "from-indigo-600 to-violet-600",
          bgAccent: "bg-indigo-50/50 border-indigo-100",
          badgeColor: "bg-indigo-100 text-indigo-800",
          recommended: true,
        };
      case "enterprise":
        return {
          icon: Building2,
          color: "from-slate-800 to-slate-950",
          bgAccent: "bg-slate-50 border-slate-200",
          badgeColor: "bg-slate-800 text-slate-100",
          recommended: false,
        };
      default:
        return {
          icon: Zap,
          color: "from-slate-500 to-slate-600",
          bgAccent: "bg-slate-50 border-slate-200",
          badgeColor: "bg-slate-500 text-slate-100",
          recommended: false,
        };
    }
  };

  const parseFeatures = (featuresObj: any) => {
    if (!featuresObj || typeof featuresObj !== "object") return [];
    return Object.entries(featuresObj)
      .filter(([_, val]) => val !== "NO")
      .map(([key, val]) => {
        if (val === "YES") return key;
        return `${key}: ${val}`;
      });
  };

  const currentPlanDetails = dbPlans?.find(
    (p: any) => p.name.toLowerCase() === currentPlanName.toLowerCase()
  );
  const currentPlanStyles = getPlanStyles(currentPlanName);

  const handleOpenUpgrade = (plan: any) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  // The discount was redeemed against the salon's current plan — it only applies to
  // renewing that same plan, not to upgrading to a different one.
  const isSelectedPlanDiscounted = (plan: any) =>
    !!plan && hasActiveDiscount && !isYearly && currentPlanName.toLowerCase() === plan.name.toLowerCase();

  const handleUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!paymentFile) {
      toast.error("Please select a payment slip to upload.");
      return;
    }

    const basePrice = isYearly
      ? (Number(selectedPlan.yearly_price) > 0 ? Number(selectedPlan.yearly_price) : Number(selectedPlan.monthly_price) * 12 * 0.8)
      : Number(selectedPlan.monthly_price);
    const price = isSelectedPlanDiscounted(selectedPlan) ? applyDiscount(basePrice) : basePrice;

    const formData = new FormData();
    formData.append("slip", paymentFile);
    formData.append("amount", price.toString());
    formData.append("plan_id", selectedPlan.id.toString());
    formData.append("billing_cycle", isYearly ? "yearly" : "monthly");

    uploadSlip(formData, {
      onSuccess: () => {
        setIsModalOpen(false);
        setPaymentFile(null);
        refetchHistory();
      },
    });
  };

  if (isLoadingPlans) {
    return (
      <div className="py-24 text-center text-slate-400 font-extrabold flex flex-col items-center justify-center gap-4 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 tracking-wider">Loading premium packages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Promo Banner */}
      {hasActiveDiscount && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-3xl">
          <Tag size={18} className="shrink-0" />
          <p className="text-sm font-bold">
            {discountPercent}% off applied to your subscription
            {discountExpiresAt
              ? ` until ${new Date(discountExpiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`
              : " — applies for the lifetime of your plan"}
            !
          </p>
        </div>
      )}

      {/* Current Subscription Status Header */}
      <div className="bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/20 p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-100/30 rounded-full blur-3xl -z-10" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-slate-900">Current Subscription</h3>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
              currentPlanStatus === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            )}>
              {currentPlanStatus === "trial" ? "14-Day Free Trial" : currentPlanStatus}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 max-w-md">
            Your salon is running on the <strong className="text-indigo-600 font-bold uppercase">{currentPlanName}</strong> plan.
            Upgrade your plan to unlock more staff members, branches, and custom booking appearances!
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm min-w-[240px]">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-md shadow-indigo-100",
            currentPlanStyles.color
          )}>
            <currentPlanStyles.icon size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Plan</p>
            <p className="font-extrabold text-slate-800">{currentPlanDetails?.display_name || currentPlanName}</p>
            {hasActiveDiscount ? (
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-slate-400 line-through">
                  LKR {Number(currentPlanDetails?.monthly_price || 0).toLocaleString()}
                </span>
                <span className="text-emerald-600">
                  LKR {applyDiscount(Number(currentPlanDetails?.monthly_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                </span>
              </p>
            ) : (
              <p className="text-xs font-semibold text-indigo-500">
                LKR {Number(currentPlanDetails?.monthly_price || 0).toLocaleString()}/mo
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Monthly / Yearly */}
      <div className="flex flex-col items-center gap-4">
        <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 flex items-center shadow-inner">
          <button
            onClick={() => setIsYearly(false)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all",
              !isYearly ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Billed Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2",
              isYearly ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Billed Annually
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {displayPlans.map((plan: any) => {
          const isCurrent = currentPlanName.toLowerCase() === plan.name.toLowerCase();
          const styles = getPlanStyles(plan.name);
          const basePrice = Number(plan.monthly_price);
          const price = isYearly 
            ? (Number(plan.yearly_price) > 0 ? Number(plan.yearly_price) / 12 : basePrice * 0.8) 
            : basePrice;

          const features = parseFeatures(plan.features);
          const PlanIcon = styles.icon;
          const showDiscount = isCurrent && hasActiveDiscount && !isYearly;
          const discountedPrice = showDiscount ? applyDiscount(price) : price;

          return (
            <div
              key={plan.id}
              className={cn(
                "bg-white rounded-[2.5rem] border p-8 flex flex-col justify-between transition-all duration-300 relative shadow-sm hover:shadow-xl",
                styles.recommended ? "border-indigo-600 ring-2 ring-indigo-600/10 scale-105 z-10" : "border-slate-200",
                isCurrent && "bg-slate-50/50 opacity-90"
              )}
            >
              {styles.recommended && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                  Most Popular
                </span>
              )}

              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-md",
                    styles.color
                  )}>
                    <PlanIcon size={22} />
                  </div>
                  {isCurrent && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      Current Plan
                    </span>
                  )}
                </div>

                {/* Info */}
                <div>
                  <h4 className="text-xl font-black text-slate-900">{plan.display_name}</h4>
                  {showDiscount ? (
                    <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-400 line-through">LKR {price.toLocaleString()}</span>
                      <span className="text-3xl font-black text-emerald-600">LKR {discountedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-slate-400 text-xs font-bold uppercase">/ month</span>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">LKR {price.toLocaleString()}</span>
                      <span className="text-slate-400 text-xs font-bold uppercase">/ month</span>
                    </div>
                  )}
                  {showDiscount && (
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mt-1">
                      {discountPercent}% Promo Discount Applied
                    </p>
                  )}
                  {isYearly && (
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mt-1">
                      Billed LKR {(price * 12).toLocaleString()} Annually
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="border-t border-slate-100 pt-6 space-y-3.5">
                  {features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mt-0.5 shrink-0">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                      <span className="text-sm font-semibold text-slate-600 leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                <Button
                  className={cn(
                    "w-full h-12 rounded-2xl text-sm font-black uppercase tracking-wider shadow-md",
                    styles.recommended && !isCurrent
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-lg"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-none"
                  )}
                  onClick={() => handleOpenUpgrade(plan)}
                >
                  {isCurrent ? "Upload Renewal Slip" : `Upgrade to ${plan.display_name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History Section */}
      <div className="mt-12 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Billing & Payment History</h3>
              <p className="text-sm font-medium text-slate-500">Track your subscription payments and statuses.</p>
            </div>
          </div>
        </div>
        <DataTable
          columns={[
            {
              header: "Date",
              accessor: (row: any) => new Date(row.created_at).toLocaleDateString(),
            },
            {
              header: "Plan Request",
              accessor: (row: any) => (
                <span className="font-bold text-slate-700 uppercase">{row.plan_name || 'N/A'}</span>
              ),
            },
            {
              header: "Coverage Period",
              accessor: (row: any) => {
                if (!row.coverage_start || !row.coverage_end) return <span className="text-slate-400 text-xs">Pending / N/A</span>;
                const start = new Date(row.coverage_start).toLocaleDateString([], { month: 'short', year: 'numeric' });
                const end = new Date(row.coverage_end).toLocaleDateString([], { month: 'short', year: 'numeric' });
                return <span className="font-medium text-slate-600 text-xs">{start} - {end}</span>;
              },
            },
            {
              header: "Amount Paid",
              accessor: (row: any) => `LKR ${Number(row.amount).toLocaleString()}`,
            },
            {
              header: "Payment Slip",
              accessor: (row: any) => {
                const url = toStorageUrl(row.slip_url);
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
                  >
                    <FileText size={14} /> View Slip
                  </a>
                );
              },
            },
            {
              header: "Status",
              accessor: (row: any) => {
                if (row.status === 'approved') return (
                  <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max">
                    <Check size={12}/> Approved
                  </span>
                );
                if (row.status === 'rejected') return (
                  <div>
                    <span className="text-rose-700 bg-rose-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max">
                      <XCircle size={12}/> Rejected
                    </span>
                    {row.rejection_reason && (
                      <p className="text-xs text-rose-600 mt-1 flex items-start gap-1 max-w-[200px]">
                        <AlertCircle size={11} className="shrink-0 mt-0.5" />
                        {row.rejection_reason}
                      </p>
                    )}
                  </div>
                );
                return (
                  <span className="text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max">
                    <Clock size={12}/> Pending
                  </span>
                );
              },
            }
          ]}
          data={historyData?.data?.history || []}
          isLoading={historyLoading}
        />
      </div>

      {/* Upgrade/Payment checkout Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Upgrade System: ${selectedPlan?.display_name}`}
        size="lg"
      >
        {selectedPlan && (
          <form onSubmit={handleUpgradeSubmit} className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center gap-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Subscription selection</p>
                <h4 className="text-lg font-black text-slate-900 mt-1">
                  {selectedPlan.display_name} ({isYearly ? "Annual Billing" : "Monthly Billing"})
                </h4>
              </div>
              <div className="text-right">
                {(() => {
                  const basePrice = isYearly
                    ? (Number(selectedPlan.yearly_price) > 0 ? Number(selectedPlan.yearly_price) : Number(selectedPlan.monthly_price) * 12 * 0.8)
                    : Number(selectedPlan.monthly_price);
                  const discounted = isSelectedPlanDiscounted(selectedPlan);
                  const finalPrice = discounted ? applyDiscount(basePrice) : basePrice;
                  return discounted ? (
                    <>
                      <p className="text-sm font-bold text-slate-400 line-through">LKR {basePrice.toLocaleString()}</p>
                      <p className="text-2xl font-black text-emerald-600">
                        LKR {finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] font-black text-emerald-600 uppercase">{discountPercent}% Promo Applied</p>
                    </>
                  ) : (
                    <p className="text-2xl font-black text-indigo-600">LKR {finalPrice.toLocaleString()}</p>
                  );
                })()}
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  {isYearly ? "Total / Year" : "Total / Month"}
                </p>
              </div>
            </div>

            {/* Bank Transfer Details — loaded from admin system settings */}
            <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="space-y-2 text-sm">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Bank Transfer Details</p>
                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-1 text-slate-700 font-medium">
                  <p>🏦 <strong className="font-bold text-slate-900">{bankDetails.bank_name || '—'}</strong></p>
                  <p>💼 Account Name: <strong className="font-bold text-slate-900">{bankDetails.bank_account_name || '—'}</strong></p>
                  <p>💳 Account Number: <strong className="font-bold text-slate-900">{bankDetails.bank_account_no || '—'}</strong></p>
                  <p>📍 Branch: <strong className="font-bold text-slate-900">{bankDetails.bank_branch || '—'}</strong></p>
                  {bankDetails.bank_instructions && (
                    <p className="text-xs text-slate-500 pt-1 border-t border-slate-100 mt-1">{bankDetails.bank_instructions}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                  Upload Bank Transfer Slip / Proof
                </label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors bg-white">
                  {paymentFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="text-indigo-500 mb-2" size={32} />
                      <span className="text-sm font-bold text-slate-700">{paymentFile.name}</span>
                      <span className="text-xs text-slate-400">{(paymentFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-slate-400 mb-2" size={32} />
                      <span className="text-sm font-bold text-slate-600">Click to upload payment slip</span>
                      <span className="text-xs text-slate-400 mt-1">PNG, JPG, or PDF</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    required
                    onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Terms Guard Alert */}
            <div className="flex gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <ShieldCheck className="text-indigo-600 shrink-0 mt-0.5" size={18} />
              <p className="text-xs font-medium text-slate-600 leading-snug">
                Your upgraded system features will unlock immediately upon successful checkout verification. Automatic billing renewals can be cancelled at any time inside your dashboard account settings.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 h-12 rounded-xl"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                loading={isUploading}
              >
                Upload & Request Approval
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
