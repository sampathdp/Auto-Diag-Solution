import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { UserPlus, Search, Phone, Mail, Award, History, Pencil, Trash2, Eye } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useAuthStore } from "@/store/useAuthStore";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const CustomersPage = () => {
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const { list, create, update, remove, history } = useCustomers();
  const { data: customers, isLoading } = list(activeBranchId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCustomerId, setHistoryCustomerId] = useState<number | null>(null);
  const { data: appointmentHistory, isLoading: isLoadingHistory } = history(historyCustomerId || 0);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "female",
    dob: "",
    notes: ""
  });

  const { mutate: createCustomer, isPending: isCreating } = create();
  const { mutate: updateCustomer, isPending: isUpdating } = update(selectedId || 0);
  const { mutate: deleteCustomer } = remove();

  const handleHistory = (id: number) => {
    setHistoryCustomerId(id);
    setIsHistoryOpen(true);
  };

  const handleEdit = (customer: any) => {
    setSelectedId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      gender: customer.gender || "female",
      dob: customer.dob || "",
      notes: customer.notes || ""
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setSelectedId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedId) {
      deleteCustomer(selectedId);
      setIsConfirmOpen(false);
      setSelectedId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && selectedId) {
       updateCustomer(formData as any, {
         onSuccess: () => {
           setIsModalOpen(false);
           setIsEditMode(false);
           setSelectedId(null);
           setFormData({ name: "", phone: "", email: "", gender: "female", dob: "", notes: "" });
         }
       });
    } else {
      createCustomer(formData, {
        onSuccess: () => {
          setIsModalOpen(false);
          setFormData({ name: "", phone: "", email: "", gender: "female", dob: "", notes: "" });
        }
      });
    }
  };

  const columns = [
    { header: "Customer", accessor: (item: any) => (
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold">
          {item.name[0]}
        </div>
        <div>
          <p className="font-bold text-slate-900">{item.name}</p>
          <div className="flex items-center text-xs text-slate-500 space-x-2">
            <span className="flex items-center"><Phone size={10} className="mr-1" /> {item.phone}</span>
            {item.email && <span className="flex items-center"><Mail size={10} className="mr-1" /> {item.email}</span>}
          </div>
        </div>
      </div>
    )},
    { header: "Loyalty", accessor: (item: any) => (
      <div className="flex items-center space-x-2">
        <Award size={16} className="text-amber-500" />
        <span className="font-bold text-slate-700">{item.loyalty_points || 0} <span className="text-[10px] text-slate-400 font-normal uppercase">pts</span></span>
      </div>
    )},
    { header: "Actions", accessor: (item: any) => (
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-slate-400 hover:text-indigo-600"
          title="View History"
          onClick={() => handleHistory(item.id)}
        >
          <Eye size={16} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-slate-400 hover:text-indigo-600"
          title="Edit Customer"
          onClick={() => handleEdit(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-slate-400 hover:text-red-600"
          title="Delete Customer"
          onClick={() => handleDelete(item.id)}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customer Directory" 
        description="View and manage your client relationships, loyalty programs, and visit history."
        action={
          <Button onClick={() => {
            setIsEditMode(false);
            setFormData({ name: "", phone: "", email: "", gender: "female", dob: "", notes: "" });
            setIsModalOpen(true);
          }}>
            <UserPlus size={18} className="mr-2" />
            Add Customer
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-96">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, phone, or email..." 
            className="bg-transparent border-none outline-none px-3 w-full text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm">Export CSV</Button>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={Array.isArray(customers) ? customers : []} 
        isLoading={isLoading}
        emptyMessage="No customers found in the system."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Edit Customer Details" : "Register New Customer"}
        description={isEditMode ? "Update the customer's profile information." : "Add a new customer to your salon database."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Full Name"
              placeholder="John Doe"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input 
              label="Phone Number"
              placeholder="+94 77 123 4567"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input 
            label="Email Address"
            placeholder="john@example.com"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              options={[
                { label: "Female", value: "female" },
                { label: "Male", value: "male" },
                { label: "Other", value: "other" }
              ]}
            />
            <Input 
              label="Date of Birth"
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            />
          </div>

          <Textarea 
            label="Notes & Preferences"
            placeholder="Any specific allergies or preferences..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {isEditMode ? "Update Customer" : "Register Customer"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Appointment History"
        description="View past and upcoming appointments for this client."
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {isLoadingHistory ? (
            <div className="py-10 text-center text-slate-400">Loading history...</div>
          ) : !Array.isArray(appointmentHistory) || appointmentHistory.length === 0 ? (
            <div className="py-10 text-center text-slate-400 italic">No appointment history found.</div>
          ) : (
            appointmentHistory.map((apt: any) => (
              <div key={apt.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{apt.service_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500 flex items-center font-medium">
                      <Search size={10} className="mr-1 opacity-50" /> {apt.appointment_date}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center font-medium">
                      <UserPlus size={10} className="mr-1 opacity-50" /> {apt.staff_name}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider",
                  apt.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" :
                  apt.status === 'cancelled' ? "bg-rose-50 text-rose-600" :
                  "bg-amber-50 text-amber-600"
                )}>
                  {apt.status}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => setIsHistoryOpen(false)}>Close</Button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This will also remove their entire visit history."
        confirmText="Yes, Delete"
        cancelText="No, Keep"
        variant="danger"
      />
    </div>
  );
};

export default CustomersPage;
