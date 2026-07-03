import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Briefcase, Search, Filter, Clock, CheckCircle2,
  XCircle, PlayCircle, Calendar as CalendarIcon, User, Scissors, Phone, MapPin
} from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useStaff } from "@/hooks/useStaff";
import { useBilling } from "@/hooks/useBilling";
import { Modal } from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";

const JobsPage = () => {
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const { list, updateAny } = useAppointments();
  const { list: listStaff } = useStaff();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // For simplicity, we fetch all for the current year or a wide range
  const { data: appointments, isLoading } = list("2024-01-01", "2026-12-31");
  const { data: staffMembers } = listStaff();
  const { mutate: doUpdate, isPending: isUpdating } = updateAny();
  const { recordPayment, getStatus } = useBilling();

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const handleAssignStaff = () => {
    if (!selectedJob || !selectedStaffId) return;
    doUpdate({ 
        id: selectedJob.id, 
        data: { staff_id: selectedStaffId } 
    }, {
        onSuccess: () => {
            setIsAssignModalOpen(false);
            setSelectedStaffId("");
        }
    });
  };

  const { data: paymentStatus, isLoading: isLoadingStatus } = getStatus(selectedJob?.id || 0);
  const { mutate: doPay, isPending: isPaying } = recordPayment();

  const handleComplete = (id: number) => {
    doUpdate({ id, data: { status: 'completed' } }, {
      onSuccess: () => {
        const job = Array.isArray(appointments) ? appointments.find((j: any) => j.id === id) : null;
        setSelectedJob(job);
        setDetailsModalOpen(true);
      }
    });
  };

  const handlePaymentSubmit = () => {
    if (!selectedJob || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (amount > (paymentStatus?.balance || 0)) {
      toast.error("Amount exceeds balance");
      return;
    }

    doPay({
      appointment_id: selectedJob.id,
      amount: amount,
      method: paymentMethod
    }, {
      onSuccess: () => {
        setPaymentAmount("");
      }
    });
  };
  const filteredJobs = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    
    return appointments.filter((job: any) => {
      const matchesSearch = 
        job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.service_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      const matchesStaff = staffFilter === "all" || String(job.staff_id) === staffFilter;
      const matchesDate = !dateFilter || job.appointment_date === dateFilter;

      return matchesSearch && matchesStatus && matchesStaff && matchesDate;
    }).sort((a: any, b: any) => {
        const dateA = new Date(`${a.appointment_date}T${a.start_time}`).getTime();
        const dateB = new Date(`${b.appointment_date}T${b.start_time}`).getTime();
        return dateA - dateB;
    });
  }, [appointments, searchQuery, statusFilter, staffFilter, dateFilter]);

  const handleStatusUpdate = (id: number, newStatus: string) => {
    doUpdate({ id, data: { status: newStatus } });
  };

  const columns = [
    { 
      header: "Job Detail", 
      accessor: (item: any) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            item.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
            item.status === 'in_progress' || item.status === 'started' ? "bg-blue-50 text-blue-600" :
            item.status === 'pending' ? "bg-amber-50 text-amber-600" :
            "bg-slate-50 text-slate-400"
          )}>
            <Scissors size={20} />
          </div>
          <div>
            <p className="font-bold text-slate-900">{item.service_name}</p>
            <p className="text-xs text-slate-500 font-medium">{item.customer_name}</p>
            {activeBranchId === null && item.branch_name && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                <MapPin size={9} />
                {item.branch_name}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: "Staff",
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
          {item.staff_id ? (
            <>
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100">
                {item.staff_name?.[0] || "S"}
              </div>
              <span className="text-sm font-bold text-slate-700">{item.staff_name}</span>
            </>
          ) : (
            <button 
              onClick={() => {
                setSelectedJob(item);
                setIsAssignModalOpen(true);
              }}
              className="group flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-[10px] font-bold text-amber-600 border border-amber-100 group-hover:border-amber-300">
                ?
              </div>
              <span className="text-sm font-bold text-amber-600 underline decoration-amber-200 underline-offset-4">Unassigned</span>
            </button>
          )}
        </div>
      )
    },
    {
      header: "Schedule",
      accessor: (item: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <CalendarIcon size={12} className="text-slate-400" />
            {item.appointment_date}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
            <Clock size={12} className="text-slate-300" />
            {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
          </div>
        </div>
      )
    },
    {
      header: "Status",
      accessor: (item: any) => (
        <Badge variant={
          item.status === 'confirmed' ? 'success' : 
          item.status === 'pending' ? 'warning' : 
          item.status === 'cancelled' ? 'danger' : 
          item.status === 'completed' ? 'success' :
          item.status === 'in_progress' || item.status === 'started' ? 'info' : 'default'
        } className="uppercase text-[10px]">
          {item.status}
        </Badge>
      )
    },
    {
      header: "Actions",
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
           {item.status === 'confirmed' && (
             <Button 
               size="sm" 
               variant="secondary" 
               className="h-8 text-[10px] font-black uppercase tracking-widest border-blue-200 text-blue-600 hover:bg-blue-50"
               onClick={() => handleStatusUpdate(item.id, 'started')}
               loading={isUpdating}
             >
               <PlayCircle size={14} className="mr-1" /> Start
             </Button>
           )}
           {(item.status === 'in_progress' || item.status === 'started') && (
             <Button 
               size="sm" 
               variant="secondary" 
               className="h-8 text-[10px] font-black uppercase tracking-widest border-emerald-200 text-emerald-600 hover:bg-emerald-50"
               onClick={() => handleComplete(item.id)}
               loading={isUpdating}
             >
               <CheckCircle2 size={14} className="mr-1" /> Complete
             </Button>
           )}
           {(item.status === 'pending' || item.status === 'completed' || item.status === 'cancelled') && (
             <Button 
                size="sm" 
                variant="secondary" 
                className="h-8 text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  setSelectedJob(item);
                  setDetailsModalOpen(true);
                }}
             >
               Details
             </Button>
           )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Job Queue" 
        description="Monitor and track all salon service jobs in real-time."
        action={
            <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                <Button variant={dateFilter === new Date().toISOString().split('T')[0] ? "primary" : "ghost"} size="sm" className="rounded-xl" onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}>Today</Button>
                <Button variant={!dateFilter ? "primary" : "ghost"} size="sm" className="rounded-xl" onClick={() => setDateFilter("")}>All Time</Button>
            </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search jobs..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { label: "All Statuses", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Confirmed", value: "confirmed" },
            { label: "In Progress", value: "in_progress" },
            { label: "Started", value: "started" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          className="bg-slate-50 border-slate-100"
        />

        <Select 
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          options={[
            { label: "All Staff", value: "all" },
            ...(Array.isArray(staffMembers) ? staffMembers.map((s: any) => ({ label: s.name, value: String(s.id) })) : [])
          ]}
          className="bg-slate-50 border-slate-100"
        />

        <div className="relative">
          <CalendarIcon className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            type="date" 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns}
          data={filteredJobs}
          isLoading={isLoading}
          emptyMessage="No jobs found matching your criteria."
        />
      </div>

      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Job Details"
        size="lg"
      >
        <div className="space-y-8">
          {/* Job Overview */}
          <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600 border border-slate-100">
                  <Scissors size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedJob?.service_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={
                      selectedJob?.status === 'confirmed' ? 'success' : 
                      selectedJob?.status === 'pending' ? 'warning' : 
                      selectedJob?.status === 'cancelled' ? 'danger' : 
                      selectedJob?.status === 'completed' ? 'success' :
                      selectedJob?.status === 'in_progress' || selectedJob?.status === 'started' ? 'info' : 'default'
                    } className="uppercase text-[9px] px-2 py-0.5">
                      {selectedJob?.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-bold">•</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedJob?.customer_name}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Appointment Time</p>
                <div className="flex items-center gap-2 font-black text-slate-700">
                  <CalendarIcon size={16} className="text-indigo-500" />
                  {selectedJob?.appointment_date}
                </div>
                <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-400 mt-1 uppercase">
                  <Clock size={14} />
                  {selectedJob?.start_time.slice(0, 5)} - {selectedJob?.end_time.slice(0, 5)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Assigned Staff</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-slate-200">
                    {selectedJob?.staff_name?.[0] || "S"}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{selectedJob?.staff_name || "Unassigned"}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Customer Contact</p>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Phone size={14} className="text-slate-400" />
                  {selectedJob?.customer_phone || "N/A"}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Amount</p>
                <p className="text-sm font-black text-slate-900">LKR {Number(selectedJob?.total_amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Payment Section - Only show for Completed or if there is a payment history */}
          {(selectedJob?.status === 'completed' || (paymentStatus?.paid_amount || 0) > 0) && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-100"></div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Payment Summary</h4>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>

              {isLoadingStatus ? (
                <div className="text-center py-4 text-slate-400 font-bold">Loading payments...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total</p>
                      <p className="text-lg font-black text-slate-900">LKR {paymentStatus?.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Paid</p>
                      <p className="text-lg font-black text-emerald-700">LKR {paymentStatus?.paid_amount.toLocaleString()}</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border text-center",
                      paymentStatus?.balance > 0 ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                    )}>
                      <p className={cn(
                        "text-[10px] font-black uppercase mb-1",
                        paymentStatus?.balance > 0 ? "text-amber-600" : "text-blue-600"
                      )}>Balance</p>
                      <p className={cn(
                        "text-lg font-black",
                        paymentStatus?.balance > 0 ? "text-amber-700" : "text-blue-700"
                      )}>LKR {paymentStatus?.balance.toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedJob?.status === 'completed' && paymentStatus?.balance > 0 && (
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Record New Payment</p>
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="Amount to Pay" 
                          type="number" 
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                        />
                        <Select 
                          label="Payment Method"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          options={[
                            { label: "Cash", value: "cash" },
                            { label: "Card", value: "card" },
                            { label: "Bank Transfer", value: "bank_transfer" },
                            { label: "QR Payment", value: "qr" },
                          ]}
                        />
                      </div>
                      <Button className="w-full h-12 rounded-2xl" onClick={handlePaymentSubmit} loading={isPaying}>
                        Record Payment
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cancellation Info */}
          {selectedJob?.status === 'cancelled' && (
            <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 text-center">
              <XCircle className="mx-auto text-rose-500 mb-2" size={32} />
              <h4 className="text-rose-900 font-black">This appointment was cancelled</h4>
              <p className="text-rose-700 text-xs mt-1 font-medium">No further actions can be taken on this job.</p>
            </div>
          )}
        </div>
      </Modal>
      
      {/* Assign Staff Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Staff Member"
        size="sm"
      >
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Assigning for</p>
                <p className="text-sm font-bold text-slate-900">{selectedJob?.service_name}</p>
                <p className="text-xs text-slate-500">{selectedJob?.customer_name}</p>
            </div>

            <Select 
                label="Select Staff Member"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                options={[
                    { label: "Choose a stylist...", value: "" },
                    ...(Array.isArray(staffMembers) ? staffMembers.map((s: any) => ({ label: s.name, value: String(s.id) })) : [])
                ]}
            />

            <Button 
                className="w-full h-12 rounded-2xl"
                onClick={handleAssignStaff}
                loading={isUpdating}
                disabled={!selectedStaffId}
            >
                Confirm Assignment
            </Button>
        </div>
      </Modal>
    </div>
  );
};

export default JobsPage;
