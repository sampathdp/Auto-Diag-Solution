import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  CreditCard,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Receipt,
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  History,
  Box,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import { useCustomers } from "@/hooks/useCustomers";
import { useInventory } from "@/hooks/useInventory";
import { useServices } from "@/hooks/useServices";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { useSettings } from "@/hooks/useSettings";
import { PrintInvoice } from "@/components/billing/PrintInvoice";
import { Printer } from "lucide-react";

const BillingPage = () => {
  const navigate = useNavigate();
  const {
    listInvoices,
    getInvoiceDetails,
    recordPayment,
    create: createInvoice,
  } = useBilling();
  const { list: listCustomers } = useCustomers();
  const { list: listProducts } = useInventory();
  const { list: listServices } = useServices();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null,
  );

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const { data: invoices, isLoading } = listInvoices(activeBranchId);
  const { data: customers } = listCustomers();
  const { data: products } = listProducts();
  const { data: services } = listServices();

  const { data: details, isLoading: isLoadingDetails } = getInvoiceDetails(
    selectedInvoiceId || 0,
  );
  const { mutate: doPay, isPending: isPaying } = recordPayment();
  const { mutate: doCreateInvoice, isPending: isCreating } = createInvoice();
  const { list: listSettings } = useSettings();
  const { data: salonSettings } = listSettings();

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];

    return invoices.filter((inv: any) => {
      const matchesSearch =
        inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || inv.payment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!Array.isArray(invoices)) return { total: 0, pending: 0, paid: 0 };

    return {
      total: invoices.reduce((acc, inv) => acc + Number(inv.total), 0),
      pending: invoices
        .filter((inv) => inv.payment_status !== "paid")
        .reduce(
          (acc, inv) => acc + (Number(inv.total) - Number(inv.paid_amount)),
          0,
        ),
      paid: invoices.reduce((acc, inv) => acc + Number(inv.paid_amount), 0),
    };
  }, [invoices]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details || !paymentAmount) return;

    doPay(
      {
        invoice_id: details.id,
        appointment_id: details.appointment_id,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
      },
      {
        onSuccess: () => {
          setPaymentAmount("");
          setIsDetailsModalOpen(false);
        },
      },
    );
  };

  const columns = [
    {
      header: "Invoice",
      accessor: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Receipt size={20} />
          </div>
          <div>
            <p className="font-mono font-bold text-slate-900">
              {item.invoice_number}
            </p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {format(new Date(item.created_at), "MMM dd, yyyy")}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      accessor: (item: any) => (
        <div>
          <p className="font-bold text-slate-700">{item.customer_name}</p>
          <p className="text-xs text-slate-500 font-medium">
            {item.customer_phone}
          </p>
        </div>
      ),
    },
    {
      header: "Amount Details",
      accessor: (item: any) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between min-w-[120px]">
            <span className="text-[10px] font-black text-slate-400 uppercase">
              Total
            </span>
            <span className="text-sm font-black text-slate-900">
              LKR {Number(item.total).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between min-w-[120px]">
            <span className="text-[10px] font-black text-emerald-600 uppercase">
              Paid
            </span>
            <span className="text-xs font-bold text-emerald-600">
              LKR {Number(item.paid_amount).toLocaleString()}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item: any) => (
        <Badge
          variant={
            item.payment_status === "paid"
              ? "success"
              : item.payment_status === "partial"
                ? "info"
                : "warning"
          }
          className="uppercase text-[10px]"
        >
          {item.payment_status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 rounded-lg"
            onClick={() => {
              setSelectedInvoiceId(item.id);
              setIsDetailsModalOpen(true);
            }}
          >
            <Eye size={14} className="mr-1" /> View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Revenue"
        description="Track all salon transactions, invoices, and payment history."
        action={
          <Button
            onClick={() => navigate("/billing/new-sale")}
            className="rounded-2xl shadow-lg shadow-indigo-200"
          >
            <Plus size={20} className="mr-2" /> New Sale
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Total Billed</p>
            <p className="text-2xl font-black text-slate-900">
              LKR {stats.total.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-600">
              Total Collected
            </p>
            <p className="text-2xl font-black text-emerald-700">
              LKR {stats.paid.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-600">Pending Balance</p>
            <p className="text-2xl font-black text-amber-700">
              LKR {stats.pending.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
          {["all", "paid", "partial", "pending"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all uppercase tracking-wider",
                statusFilter === status
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-2">
        <DataTable
          columns={columns}
          data={filteredInvoices}
          isLoading={isLoading}
          emptyMessage="No invoices found."
        />
      </div>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Invoice Details"
        size="lg"
      >
        <div className="space-y-8">
          {isLoadingDetails ? (
            <div className="py-20 text-center font-bold text-slate-400">
              Loading details...
            </div>
          ) : (
            <>
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-2xl font-black text-slate-900">
                      {details?.invoice_number}
                    </h3>
                    <Button 
                      size="sm" 
                      onClick={handlePrint}
                      className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                    >
                      <Printer size={14} className="mr-2" /> Print Invoice
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge
                      variant={
                        details?.payment_status === "paid"
                          ? "success"
                          : details?.payment_status === "partial"
                            ? "info"
                            : "warning"
                      }
                      className="uppercase text-[9px]"
                    >
                      {details?.payment_status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-bold uppercase">
                      Issued on{" "}
                      {details?.created_at
                        ? format(new Date(details.created_at), "PPP")
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Customer
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {details?.customer_name}
                  </p>
                  <p className="text-sm font-medium text-slate-500">
                    {details?.customer_phone}
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                    Total Bill
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    LKR {Number(details?.total || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">
                    Total Paid
                  </p>
                  <p className="text-xl font-black text-emerald-700">
                    LKR{" "}
                    {Number(
                      details?.payments?.reduce(
                        (acc: any, p: any) => acc + Number(p.amount),
                        0,
                      ) || 0,
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[10px] font-black text-amber-600 uppercase mb-1">
                    Balance
                  </p>
                  <p className="text-xl font-black text-amber-700">
                    LKR{" "}
                    {(
                      Number(details?.total || 0) -
                      Number(
                        details?.payments?.reduce(
                          (acc: any, p: any) => acc + Number(p.amount),
                          0,
                        ) || 0,
                      )
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Invoice Items Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Box size={16} className="text-indigo-500" /> Invoice Items
                </h4>
                <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-100/50">
                        <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase">
                          Item
                        </th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase text-center">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase text-right">
                          Price
                        </th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details?.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {item.item_name}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 font-medium">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-medium">
                            LKR {Number(item.unit_price).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            LKR {Number(item.total_price).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Payment History */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-indigo-500" /> Payment
                    History
                  </h4>
                  <div className="space-y-3">
                    {!details?.payments || details.payments.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">
                        No payments recorded yet.
                      </p>
                    ) : (
                      details.payments.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              LKR {Number(p.amount).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                              {format(new Date(p.paid_at), "MMM dd, HH:mm")} •{" "}
                              {p.payment_method}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Record Payment */}
                {details?.payment_status !== "paid" && (
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Record New Payment
                    </h4>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <Input
                        label="Amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                      <Select
                        label="Method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        options={[
                          { label: "Cash", value: "cash" },
                          { label: "Card", value: "card" },
                          { label: "Bank Transfer", value: "bank_transfer" },
                          { label: "QR Payment", value: "qr" },
                        ]}
                      />
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-2xl"
                        loading={isPaying}
                      >
                        Add Payment
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Hidden Print Template */}
      <div className="hidden">
        <PrintInvoice 
            ref={printRef} 
            invoice={details} 
            salon={salonSettings} 
        />
      </div>
    </div>
  );
};

export default BillingPage;
