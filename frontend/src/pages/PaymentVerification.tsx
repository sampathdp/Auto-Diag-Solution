import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { CheckCircle2, XCircle, Eye, QrCode, CreditCard } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PaymentVerification = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const {
    data: proofs,
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = useApiQuery<any>(["payment-proofs"], "/payment-proofs");

  const {
    data: history,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useApiQuery<any>(["payment-proofs-history"], "/payment-proofs/history");

  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { mutate: approve, isPending: isApproving } = useApiMutation(
    (id: number) => apiClient.post(`/payment-proofs/${id}/approve`, {}),
    "Payment approved!",
  );

  const { mutate: reject, isPending: isRejecting } = useApiMutation(
    ({ id, reason }: { id: number; reason: string }) =>
      apiClient.post(`/payment-proofs/${id}/reject`, { reason }),
    "Payment rejected.",
  );

  const handleApprove = (id: number) => {
    approve(id, {
      onSuccess: () => {
        setSelectedProof(null);
        refetchPending();
        refetchHistory();
      },
    });
  };

  const handleReject = (id: number) => {
    if (!rejectionReason)
      return alert("Please provide a reason for rejection.");
    reject(
      { id, reason: rejectionReason },
      {
        onSuccess: () => {
          setSelectedProof(null);
          refetchPending();
          refetchHistory();
        },
      },
    );
  };

  const pendingColumns = [
    { header: "Customer", accessor: "customer_name" },
    {
      header: "Amount",
      accessor: (item: any) => (
        <span className="font-bold text-slate-900">
          LKR {Number(item.amount).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Method",
      accessor: (item: any) => (
        <span
          className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit",
            item.payment_method === "lanka_qr"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-blue-100 text-blue-700",
          )}
        >
          {item.payment_method === "lanka_qr" ? (
            <QrCode size={10} />
          ) : (
            <CreditCard size={10} />
          )}
          {item.payment_method?.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Appointment",
      accessor: (item: any) => (
        <div className="flex flex-col text-xs text-slate-500">
          <span className="font-bold text-slate-700">
            {item.appointment_date}
          </span>
          <span>{item.start_time}</span>
        </div>
      ),
    },
    {
      header: "Proof",
      accessor: (item: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedProof(item)}
        >
          <Eye size={14} className="mr-1" /> View Image
        </Button>
      ),
    },
    {
      header: "Actions",
      accessor: (item: any) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-3"
            onClick={() => handleApprove(item.id)}
          >
            <CheckCircle2 size={14} className="mr-2" /> Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl px-3"
            onClick={() => setSelectedProof(item)}
          >
            <XCircle size={14} className="mr-2" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  const historyColumns = [
    { header: "Customer", accessor: "customer_name" },
    {
      header: "Amount",
      accessor: (item: any) => (
        <span className="font-bold text-slate-900">
          LKR {Number(item.amount).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Method",
      accessor: (item: any) => (
        <span
          className={cn(
            "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight flex items-center gap-1 w-fit",
            item.payment_method === "lanka_qr"
              ? "text-indigo-600 bg-indigo-50"
              : "text-blue-600 bg-blue-50",
          )}
        >
          {item.payment_method === "lanka_qr" ? (
            <QrCode size={8} />
          ) : (
            <CreditCard size={8} />
          )}
          {item.payment_method?.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (item: any) => (
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block text-center",
              item.status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700",
            )}
          >
            {item.status}
          </span>
          {item.status === "rejected" && (
            <span className="text-[10px] text-rose-500 italic max-w-[150px] truncate">
              "{item.rejection_reason}"
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Verified By",
      accessor: (item: any) => (
        <div className="flex flex-col text-xs">
          <span className="font-bold text-slate-700">
            {item.verified_by_name || "System"}
          </span>
          <span className="text-slate-400 text-[10px]">
            {item.updated_at
              ? format(new Date(item.updated_at), "MMM d, HH:mm")
              : "-"}
          </span>
        </div>
      ),
    },
    {
      header: "Proof",
      accessor: (item: any) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 px-4"
          onClick={() => setSelectedProof(item)}
        >
          <Eye size={14} className="mr-2" /> View Image
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader
          title="Payment Verification"
          description="Verify customer uploads for LankaQR and Bank Transfers."
        />
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <button
            onClick={() => setActiveTab("pending")}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === "pending"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            Pending ({proofs?.data?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            History
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === "pending" ? (
          <DataTable
            columns={pendingColumns}
            data={proofs?.data || []}
            isLoading={isLoadingPending}
            emptyMessage="No pending payments to verify."
          />
        ) : (
          <DataTable
            columns={historyColumns}
            data={history?.data || []}
            isLoading={isLoadingHistory}
            emptyMessage="No verification history found."
          />
        )}
      </div>

      <Modal
        isOpen={!!selectedProof}
        onClose={() => setSelectedProof(null)}
        title={
          selectedProof?.status === "pending"
            ? "Verify Payment Proof"
            : "Proof Details"
        }
        size="lg"
      >
        {selectedProof && (
          <div className="space-y-6">
            <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
              <img
                src={`http://localhost:8000${selectedProof.proof_image}`}
                alt="Proof"
                className="w-full h-auto max-h-[500px] object-contain"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-sm">
              <div>
                <p className="text-slate-500">Amount Expected</p>
                <p className="font-bold">
                  LKR {Number(selectedProof.amount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Customer</p>
                <p className="font-bold">{selectedProof.customer_name}</p>
              </div>
            </div>

            {selectedProof.status === "pending" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. Reference number not found, incorrect amount..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3">
              {selectedProof.status === "pending" ? (
                <>
                  <Button
                    variant="ghost"
                    className="flex-1 text-rose-600 hover:bg-rose-50"
                    onClick={() => handleReject(selectedProof.id)}
                    loading={isRejecting}
                  >
                    Reject Proof
                  </Button>
                  <Button
                    className="flex-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleApprove(selectedProof.id)}
                    loading={isApproving}
                  >
                    Approve Payment
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  onClick={() => setSelectedProof(null)}
                >
                  Close View
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentVerification;
