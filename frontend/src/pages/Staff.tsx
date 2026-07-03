import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Plus, Users, UserCheck, Trash2, Mail, Briefcase, KeyRound, ShieldCheck, Percent } from "lucide-react";
import { useStaff } from "@/hooks/useStaff";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StaffSchema, StaffFormValues } from "@/schemas/StaffSchema";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const PAGE_PERMISSIONS = [
  { key: "appointments.view", label: "Appointments", description: "Dashboard, Calendar & Jobs" },
  { key: "customers.view",    label: "Customers",    description: "View and manage customers" },
  { key: "services.view",     label: "Services",     description: "View service catalogue" },
  { key: "staff.view",        label: "Staff",        description: "View staff members" },
  { key: "inventory.view",    label: "Inventory",    description: "View and manage products" },
  { key: "billing.view",      label: "Billing & Expenses", description: "Invoices and expense records" },
  { key: "billing.accept_payment", label: "Verify Payments", description: "Approve/reject payment proofs" },
  { key: "reports.view",      label: "Reports",      description: "Sales and performance reports" },
  { key: "settings.view",     label: "Settings",     description: "Salon settings and appearance" },
];

const StaffPage = () => {
  const { list, create, update, remove, changePassword } = useStaff();
  const { data: staffData, isLoading } = list();

  // Backend returns { staff: [], max_staff: N }
  const staff: any[] = staffData?.staff ?? [];
  const maxStaffLimit: number = staffData?.max_staff ?? 1;

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await apiClient.get("/branches");
      return res.data.data || [];
    },
  });

  const activeStaffCount = staff.length;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<number | null>(null);
  const [passwordStaff, setPasswordStaff] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [permissionsStaff, setPermissionsStaff] = useState<any>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [commissionsStaff, setCommissionsStaff] = useState<any>(null);
  const [commissionRows, setCommissionRows] = useState<any[]>([]);

  const queryClient = useQueryClient();

  const { data: staffPermissionsData, isLoading: isLoadingPerms } = useQuery({
    queryKey: ["staff-permissions", permissionsStaff?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/staff/${permissionsStaff.id}/permissions`);
      return (res.data.data ?? []) as string[];
    },
    enabled: !!permissionsStaff,
  });

  // React Query v5 removed onSuccess from useQuery — sync via effect instead
  useEffect(() => {
    if (staffPermissionsData !== undefined) {
      setSelectedPerms(staffPermissionsData);
    }
  }, [staffPermissionsData]);

  const { mutate: savePermissions, isPending: isSavingPerms } = useMutation({
    mutationFn: (perms: string[]) =>
      apiClient.put(`/staff/${permissionsStaff?.id}/permissions`, { permissions: perms }),
    onSuccess: () => {
      toast.success("Permissions updated!");
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", permissionsStaff?.id] });
      setPermissionsStaff(null);
    },
    onError: () => toast.error("Failed to update permissions"),
  });

  const togglePerm = (key: string) =>
    setSelectedPerms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );

  const { data: serviceCommissionsData, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ["staff-service-commissions", commissionsStaff?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/staff/${commissionsStaff.id}/service-commissions`);
      return (res.data.data ?? []) as any[];
    },
    enabled: !!commissionsStaff,
  });

  useEffect(() => {
    if (serviceCommissionsData !== undefined) {
      setCommissionRows(
        serviceCommissionsData.map((row: any) => ({
          service_id: row.service_id,
          service_name: row.service_name,
          price: row.price,
          is_custom: row.commission_type !== null && row.commission_value !== null,
          commission_type: row.commission_type ?? "percentage",
          commission_value: row.commission_value !== null ? String(row.commission_value) : "",
        }))
      );
    }
  }, [serviceCommissionsData]);

  const { mutate: saveCommissions, isPending: isSavingCommissions } = useMutation({
    mutationFn: (rows: any[]) => {
      const payload = rows.map(r => ({
        service_id: r.service_id,
        commission_type: r.commission_type,
        commission_value: r.is_custom ? r.commission_value : "",
      }));
      return apiClient.put(`/staff/${commissionsStaff?.id}/service-commissions`, { commissions: payload });
    },
    onSuccess: () => {
      toast.success("Service commissions updated!");
      queryClient.invalidateQueries({ queryKey: ["staff-service-commissions", commissionsStaff?.id] });
      setCommissionsStaff(null);
    },
    onError: () => toast.error("Failed to update commissions"),
  });

  const updateCommissionRow = (serviceId: number, field: string, value: any) =>
    setCommissionRows(prev =>
      prev.map(r => r.service_id === serviceId ? { ...r, [field]: value } : r)
    );

  const { mutate: doCreate, isPending: isCreating } = create();
  const { mutate: doUpdate, isPending: isUpdating } = update(editingStaff?.id);
  const { mutate: doRemove } = remove();
  const { mutate: doChangePassword, isPending: isChangingPassword } = changePassword();

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(StaffSchema),
    defaultValues: {
      is_active: true,
      commission_enabled: true,
      commission_type: "percentage",
      commission_value: 0,
      salary: 0,
      branch_id: null
    }
  });

  const onSubmit = (values: StaffFormValues) => {
    if (editingStaff) {
      doUpdate(values, { onSuccess: () => { setIsModalOpen(false); setEditingStaff(null); } });
    } else {
      doCreate(values, { onSuccess: () => { setIsModalOpen(false); form.reset(); } });
    }
  };

  const handleEdit = (member: any) => {
    setEditingStaff(member);
    form.reset({
      name: member.name,
      email: member.email,
      designation: member.designation,
      salary: member.salary,
      commission_enabled: Boolean(member.commission_enabled ?? 1),
      commission_type: member.commission_type,
      commission_value: member.commission_value,
      is_active: Boolean(member.is_active),
      branch_id: member.branch_id || null,
      password: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenPasswordModal = (member: any) => {
    setPasswordStaff(member);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handleChangePassword = () => {
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError("");
    doChangePassword(
      { id: passwordStaff.id, password: newPassword },
      { onSuccess: () => setPasswordStaff(null) }
    );
  };

  const columns = [
    { header: "Staff Member", accessor: (item: any) => (
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase">
          {item.name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-slate-900">{item.name}</p>
          <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <Mail size={10} className="mr-1" /> {item.email}
          </div>
        </div>
      </div>
    )},
    { header: "Designation", accessor: (item: any) => (
      <div className="space-y-0.5 text-left">
        <div className="flex items-center text-slate-600 font-medium text-sm">
          <Briefcase size={14} className="mr-2 text-slate-400" />
          {item.designation}
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase pl-5">
          📍 {item.branch_name || "All Locations"}
        </p>
      </div>
    )},
    { header: "Compensation", accessor: (item: any) => (
      <div className="space-y-0.5">
        <p className="text-sm font-bold text-slate-700">LKR {Number(item.salary).toLocaleString()}</p>
        {item.commission_enabled ? (
          <p className="text-[10px] text-indigo-600 font-bold uppercase">
            {item.commission_type === 'percentage' ? `${item.commission_value}% Comm.` : `LKR ${item.commission_value} Comm.`}
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 font-bold uppercase">No Commission</p>
        )}
      </div>
    )},
    { header: "Status", accessor: (item: any) => (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
        item.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
      }`}>
        {item.is_active ? "Active" : "Inactive"}
      </span>
    )},
    { header: "Actions", accessor: (item: any) => (
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>Edit</Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-indigo-500"
          title="Change Password"
          onClick={() => handleOpenPasswordModal(item)}
        >
          <KeyRound size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-emerald-600"
          title="Manage Permissions"
          onClick={() => { setPermissionsStaff(item); setSelectedPerms([]); }}
        >
          <ShieldCheck size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={item.commission_enabled ? "text-amber-500" : "text-slate-300"}
          title={item.commission_enabled ? "Service Commissions" : "Commission disabled for this staff member"}
          disabled={!item.commission_enabled}
          onClick={() => { setCommissionsStaff(item); setCommissionRows([]); }}
        >
          <Percent size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => { setStaffToDelete(item.id); setIsDeleteConfirmOpen(true); }}>
          <Trash2 size={14} />
        </Button>
      </div>
    )},
  ];

  const limitLabel = maxStaffLimit >= 9999 ? "Unlimited" : `${maxStaffLimit} Staff`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage your team, define roles, and configure commission structures."
        action={
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex text-right mr-2 flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subscription Limit</span>
              <span className="text-xs font-bold text-slate-700 uppercase">
                {activeStaffCount} / {limitLabel}
              </span>
            </div>
            <Button
              onClick={() => { setEditingStaff(null); form.reset({ is_active: true, commission_enabled: true, salary: 0, commission_value: 0, branch_id: null }); setIsModalOpen(true); }}
              disabled={activeStaffCount >= maxStaffLimit}
            >
              <Plus size={18} className="mr-2" />
              Add Staff Member
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Team</p>
            <p className="text-2xl font-black text-slate-900">{staff.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Now</p>
            <p className="text-2xl font-black text-slate-900">{staff.filter((s: any) => s.is_active).length}</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={staff}
        isLoading={isLoading}
        emptyMessage="No staff members registered yet."
      />

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
        size="lg"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" {...form.register("name")} error={form.formState.errors.name?.message} placeholder="e.g. John Doe" />
            <Input label="Email Address" {...form.register("email")} error={form.formState.errors.email?.message} placeholder="john@example.com" />
          </div>

          {!editingStaff && (
            <Input label="Temporary Password" type="password" {...form.register("password")} error={form.formState.errors.password?.message} />
          )}

          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <Input label="Designation" {...form.register("designation")} error={form.formState.errors.designation?.message} placeholder="e.g. Senior Stylist" />
            <Input label="Base Salary (LKR)" type="number" {...form.register("salary")} error={form.formState.errors.salary?.message} />
            <Select label="Branch Location" {...form.register("branch_id")} error={form.formState.errors.branch_id?.message}>
              <option value="">All Branches (Shared)</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">Commission Enabled</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Does this staff member earn commission on services?</p>
              </div>
              <button
                type="button"
                onClick={() => form.setValue("commission_enabled", !form.watch("commission_enabled"))}
                className={cn(
                  "w-10 h-6 rounded-full transition-all duration-200 relative shrink-0",
                  form.watch("commission_enabled") ? "bg-indigo-600" : "bg-slate-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                  form.watch("commission_enabled") ? "left-5" : "left-1"
                )} />
              </button>
            </div>

            {form.watch("commission_enabled") && (
              <div className="grid grid-cols-2 gap-4">
                <Select label="Commission Type" {...form.register("commission_type")} error={form.formState.errors.commission_type?.message}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (LKR)</option>
                </Select>
                <Input
                  label={form.watch("commission_type") === 'percentage' ? "Commission %" : "Commission Amount (LKR)"}
                  type="number"
                  {...form.register("commission_value")}
                  error={form.formState.errors.commission_value?.message}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-xl">
            <input type="checkbox" {...form.register("is_active")} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <label className="text-sm font-medium text-slate-700">Active and available for appointments</label>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {editingStaff ? "Update Staff" : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={!!passwordStaff}
        onClose={() => setPasswordStaff(null)}
        title={`Change Password — ${passwordStaff?.name ?? ""}`}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />
          {passwordError && (
            <p className="text-xs text-rose-500 font-medium">{passwordError}</p>
          )}
          <div className="pt-2 flex justify-end space-x-3">
            <Button variant="ghost" type="button" onClick={() => setPasswordStaff(null)}>Cancel</Button>
            <Button onClick={handleChangePassword} loading={isChangingPassword}>
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => { if (staffToDelete) { doRemove(staffToDelete, { onSuccess: () => setIsDeleteConfirmOpen(false) }); } }}
        title="Remove Staff Member"
        description="Are you sure you want to remove this staff member? Their account will also be deleted."
        confirmText="Remove"
        variant="danger"
      />

      {/* Service Commissions Modal */}
      <Modal
        isOpen={!!commissionsStaff}
        onClose={() => setCommissionsStaff(null)}
        title={`Service Commissions — ${commissionsStaff?.name ?? ""}`}
        size="lg"
      >
        <div className="space-y-4 py-1">
          <p className="text-xs text-slate-500 font-medium">
            Set a custom commission rate per service. Leave on default to use this staff member's base commission ({commissionsStaff?.commission_value}{commissionsStaff?.commission_type === "percentage" ? "%" : " LKR fixed"}).
          </p>

          {isLoadingCommissions ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : commissionRows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No services found.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {commissionRows.map(row => (
                <div
                  key={row.service_id}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-3 transition-all",
                    row.is_custom ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className={cn("text-sm font-bold truncate", row.is_custom ? "text-amber-800" : "text-slate-700")}>
                        {row.service_name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        LKR {Number(row.price).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {row.is_custom && (
                        <>
                          <select
                            value={row.commission_type}
                            onChange={e => updateCommissionRow(row.service_id, "commission_type", e.target.value)}
                            className="text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                          >
                            <option value="percentage">% of price</option>
                            <option value="fixed">Fixed (LKR)</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.commission_value}
                            onChange={e => updateCommissionRow(row.service_id, "commission_value", e.target.value)}
                            placeholder="0"
                            className="w-20 text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 font-bold text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => updateCommissionRow(row.service_id, "is_custom", !row.is_custom)}
                        className={cn(
                          "w-10 h-6 rounded-full transition-all duration-200 relative shrink-0",
                          row.is_custom ? "bg-amber-500" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                          row.is_custom ? "left-5" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setCommissionsStaff(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={isSavingCommissions}
              onClick={() => saveCommissions(commissionRows)}
            >
              Save Commissions
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={!!permissionsStaff}
        onClose={() => setPermissionsStaff(null)}
        title={`Page Permissions — ${permissionsStaff?.name ?? ""}`}
        size="md"
      >
        <div className="space-y-5 py-1">
          <p className="text-xs text-slate-500 font-medium">
            Control which pages this staff member can access. Changes take effect on their next login.
          </p>

          {isLoadingPerms ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {PAGE_PERMISSIONS.map(({ key, label, description }) => {
                const enabled = selectedPerms.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePerm(key)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left",
                      enabled
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                    )}
                  >
                    <div>
                      <p className={cn("text-sm font-bold", enabled ? "text-indigo-700" : "text-slate-700")}>
                        {label}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{description}</p>
                    </div>
                    <div className={cn(
                      "w-10 h-6 rounded-full transition-all duration-200 relative shrink-0 ml-4",
                      enabled ? "bg-indigo-600" : "bg-slate-200"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                        enabled ? "left-5" : "left-1"
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setPermissionsStaff(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={isSavingPerms}
              onClick={() => savePermissions(selectedPerms)}
            >
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffPage;
