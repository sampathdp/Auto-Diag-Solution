import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Plus, Search, Edit2, Trash2, Key, Copy, Users, UserCircle, Calendar, CalendarDays, Scissors, UsersRound, Package, CreditCard, BarChart3, Settings, Building2, Clock, Mail, Phone, Shield, LayoutDashboard, Upload, Download, CheckCircle2, AlertCircle, Loader2, FlaskConical, ExternalLink } from "lucide-react";
import { useSalons } from "@/hooks/useSalons";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SalonSchema, SalonFormValues } from "@/schemas/SalonSchema";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Salon } from "@/services/SalonService";
import { useAuthStore } from "@/store/useAuthStore";

const SalonsPage = () => {
  const { list, remove, create, update } = useSalons();
  const { data: salons, isLoading } = list();
  const { mutate: deleteSalon, isPending: isDeleting } = remove();
  const { mutate: createSalon, isPending: isCreating } = create();
  const { mutate: updateSalon, isPending: isUpdating } = update();

  const FEATURE_ICONS: Record<string, { icon: any; label: string }> = {
    'appointments.*': { icon: Calendar, label: 'Appointments' },
    'customers.*': { icon: Users, label: 'Customers' },
    'services.*': { icon: Scissors, label: 'Services' },
    'staff.*': { icon: UsersRound, label: 'Staff' },
    'inventory.*': { icon: Package, label: 'Inventory' },
    'billing.*': { icon: CreditCard, label: 'Billing' },
    'reports.*': { icon: BarChart3, label: 'Reports' },
    'settings.*': { icon: Settings, label: 'Settings' },
  };

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [viewingCredentials, setViewingCredentials] = useState<any>(null);
  const [viewingSalonUsersId, setViewingSalonUsersId] = useState<number | null>(null);
  const [newSalonCredentials, setNewSalonCredentials] = useState<{ email: string; password: string; salon_name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/packages");
      return res.data.data || [];
    },
  });

  const { mutate: changePlan, isPending: isChangingPlan } = useApiMutation(
    ({ id, plan_id }: { id: number; plan_id: number }) =>
      apiClient.put(`/admin/salons/${id}/plan`, { plan_id }),
    "Subscription plan updated!",
    ['admin', 'salons']
  );

  const { data: salonUsers, isLoading: isLoadingUsers } = useApiQuery<any>(
    [`salon-users`, viewingSalonUsersId],
    `/salons/${viewingSalonUsersId}/users`,
    { enabled: !!viewingSalonUsersId }
  );

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SalonFormValues>({
    resolver: zodResolver(SalonSchema),
    defaultValues: {
      is_active: true,
      timezone: "Asia/Colombo",
      currency: "LKR",
    }
  });

  const { mutate: resetPassword, isPending: isResetting } = useApiMutation(
    (id: number) => apiClient.post(`/admin/salons/${id}/reset-password`),
    "Password reset successfully!",
    []
  );

  const handleResetPassword = () => {
    if (viewingCredentials?.id) {
      resetPassword(viewingCredentials.id, {
        onSuccess: (response: any) => {
          setViewingCredentials({
            ...viewingCredentials,
            newPassword: response.data.data.password
          });
        }
      });
    }
  };

  useEffect(() => {
    if (editingSalon) {
      reset({
        name: editingSalon.name,
        slug: editingSalon.slug,
        email: editingSalon.email || "",
        phone: editingSalon.phone || "",
        address: editingSalon.address || "",
        is_active: editingSalon.is_active,
        timezone: editingSalon.timezone || "Asia/Colombo",
        currency: editingSalon.currency || "LKR",
        grace_period_days: editingSalon.grace_period_days !== undefined ? editingSalon.grace_period_days : 3,
      });
      setSelectedPlanId(editingSalon.plan_id ? Number(editingSalon.plan_id) : null);
    } else {
      reset({
        name: "",
        slug: "",
        email: "",
        phone: "",
        address: "",
        owner_name: "",
        is_active: true,
        currency: "LKR",
        grace_period_days: 3,
      });
    }
  }, [editingSalon, reset]);

  const onFormSubmit = (data: SalonFormValues) => {
    if (editingSalon) {
      updateSalon({ ...data, id: editingSalon.id } as any, {
        onSuccess: () => {
          const planChanged = selectedPlanId && selectedPlanId !== Number(editingSalon.plan_id);
          if (planChanged) {
            changePlan({ id: editingSalon.id, plan_id: selectedPlanId! }, {
              onSuccess: () => { setIsModalOpen(false); setEditingSalon(null); },
              onError: () => { setIsModalOpen(false); setEditingSalon(null); },
            });
          } else {
            setIsModalOpen(false);
            setEditingSalon(null);
          }
        }
      });
    } else {
      createSalon(data, {
        onSuccess: (response: any) => {
          setIsModalOpen(false);
          if (response.data?.data?.password) {
            setNewSalonCredentials(response.data.data);
          }
        }
      });
    }
  };

  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false);
  const [startDateSalonId, setStartDateSalonId] = useState<number | null>(null);
  const [startDateSalon, setStartDateSalon] = useState<any>(null);
  const [inputStartDate, setInputStartDate] = useState('');
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [selectedSalonForFeatures, setSelectedSalonForFeatures] = useState<any>(null);

  // Temp access state
  const [tempAccessSalon, setTempAccessSalon] = useState<any>(null);
  const [tempCreds, setTempCreds] = useState<{ email: string; password: string; login_url: string } | null>(null);
  const [tempAccessLoading, setTempAccessLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const handleCreateTempAccess = async () => {
    if (!tempAccessSalon) return;
    setTempAccessLoading(true);
    try {
      const res = await apiClient.post(`/admin/salons/${tempAccessSalon.id}/temp-access`);
      setTempCreds(res.data.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create temp access.');
    } finally {
      setTempAccessLoading(false);
    }
  };

  const handleRevokeTempAccess = async () => {
    if (!tempAccessSalon) return;
    setRevokeLoading(true);
    try {
      await apiClient.delete(`/admin/salons/${tempAccessSalon.id}/temp-access`);
      setTempCreds(null);
      setTempAccessSalon(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to revoke temp access.');
    } finally {
      setRevokeLoading(false);
    }
  };

  // Import state
  const [importSalon, setImportSalon] = useState<any>(null);
  const [importTab, setImportTab] = useState<'inventory' | 'categories' | 'services'>('inventory');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const handleImport = async () => {
    if (!importFile || !importSalon) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await apiClient.post(`/admin/salons/${importSalon.id}/import/${importTab}`, formData);
      setImportResult(res.data.data);
      setImportFile(null);
    } catch (err: any) {
      setImportResult({ imported: 0, skipped: 0, errors: [err?.response?.data?.message || 'Import failed.'] });
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = (type: string) => {
    const templates: Record<string, { filename: string; rows: string[][] }> = {
      inventory: {
        filename: 'inventory_template.csv',
        rows: [
          ['name', 'sku', 'cost_price', 'selling_price', 'stock_quantity', 'low_stock_alert'],
          ['Shampoo Pro', 'SH-001', '500', '750', '10', '2'],
          ['Hair Dye Black', 'HD-001', '300', '450', '20', '5'],
        ],
      },
      categories: {
        filename: 'service_categories_template.csv',
        rows: [['name'], ['Hair Services'], ['Nail Services'], ['Skin Care']],
      },
      services: {
        filename: 'services_template.csv',
        rows: [
          ['name', 'category_name', 'price', 'duration_minutes', 'description'],
          ['Haircut', 'Hair Services', '1500', '30', 'Basic haircut'],
          ['Hair Colour', 'Hair Services', '3500', '90', 'Full hair colour'],
          ['Manicure', 'Nail Services', '1200', '45', ''],
        ],
      },
    };
    const tpl = templates[type] ?? templates['inventory'];
    const csv = tpl.rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = tpl.filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const { mutate: setStartDateMutate, isPending: isSettingStartDate } = useApiMutation(
    ({ id, start_date }: { id: number; start_date: string }) =>
      apiClient.post(`/admin/salons/${id}/set-start-date`, { start_date }),
    "Subscription dates updated!",
    ['admin', 'salons']
  );

  const handleSetStartDate = () => {
    if (!startDateSalonId || !inputStartDate) return;
    setStartDateMutate({ id: startDateSalonId, start_date: inputStartDate }, {
      onSuccess: () => setIsStartDateModalOpen(false)
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const clean = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const d = new Date(clean.includes('T') ? clean : clean + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const { mutate: updateFeatures, isPending: isUpdatingFeatures } = useApiMutation(
    ({ id, permissions }: { id: number; permissions: string[] | null }) => 
      apiClient.put(`/admin/salons/${id}`, { custom_permissions: permissions ? JSON.stringify(permissions) : null }),
    "Salon features updated successfully!",
    ['admin', 'salons']
  );

  const [tempPermissions, setTempPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (selectedSalonForFeatures) {
      if (selectedSalonForFeatures.custom_permissions) {
        try {
          const perms = JSON.parse(selectedSalonForFeatures.custom_permissions);
          setTempPermissions(perms.includes('*') ? Object.keys(FEATURE_ICONS) : perms);
        } catch (e) { setTempPermissions([]); }
      } else if (selectedSalonForFeatures.sub_status === 'trial') {
        setTempPermissions(Object.keys(FEATURE_ICONS));
      } else if (selectedSalonForFeatures.plan_permissions) {
        try {
          const perms = JSON.parse(selectedSalonForFeatures.plan_permissions);
          setTempPermissions(perms.includes('*') ? Object.keys(FEATURE_ICONS) : perms.map((p: string) => p.replace('.view', '.*').replace('.advanced', '.*')));
        } catch (e) { setTempPermissions([]); }
      } else {
        setTempPermissions([]);
      }
    }
  }, [selectedSalonForFeatures]);

  const handleTogglePermission = (key: string) => {
    setTempPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleEnterSalon = (salonId: number) => {
    useAuthStore.getState().setTargetSalonId(salonId);
    window.location.href = '/dashboard';
  };

  const handleSaveFeatures = () => {
    if (selectedSalonForFeatures) {
      updateFeatures({ 
        id: selectedSalonForFeatures.id, 
        permissions: tempPermissions.length === Object.keys(FEATURE_ICONS).length ? ['*'] : tempPermissions 
      }, {
        onSuccess: () => setIsFeaturesModalOpen(false)
      });
    }
  };

  const getDaysLeft = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const cleanExpiryDate = expiryDate.includes(' ') ? expiryDate.replace(' ', 'T') : expiryDate;
    const diff = new Date(cleanExpiryDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };


  const renderFeatureGrid = (salon: any) => {
    let activePerms: string[] = [];
    
    // PRIORITY 1: Custom Overrides
    if (salon.custom_permissions) {
      try {
        const perms = JSON.parse(salon.custom_permissions);
        activePerms = perms.includes('*') ? Object.keys(FEATURE_ICONS) : perms;
      } catch (e) { activePerms = []; }
    } 
    // PRIORITY 2: Trial (Full Access)
    else if (salon.sub_status === 'trial') {
      activePerms = Object.keys(FEATURE_ICONS);
    } 
    // PRIORITY 3: Plan-based
    else if (salon.plan_permissions) {
      try {
        const perms = JSON.parse(salon.plan_permissions);
        if (perms.includes('*')) {
          activePerms = Object.keys(FEATURE_ICONS);
        } else {
          activePerms = perms.map((p: string) => p.replace('.view', '.*').replace('.advanced', '.*'));
        }
      } catch (e) { activePerms = []; }
    }

    return (
      <div className="mt-4 pt-4 border-t border-slate-50">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Feature Access</p>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(FEATURE_ICONS).map(([key, { icon: Icon, label }]) => {
            const isActive = activePerms.some(p => p === key || p === '*');
            return (
              <div 
                key={key} 
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-300",
                  isActive 
                    ? "bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm shadow-indigo-100/50" 
                    : "bg-slate-50 border-transparent text-slate-300 opacity-40 grayscale"
                )}
                title={label}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salon Management"
        description="Manage your multi-tenant salon entities, branding, and status."
        action={
          <Button onClick={() => {
            setEditingSalon(null);
            setIsModalOpen(true);
          }} className="shadow-lg shadow-indigo-200">
            <Plus size={18} className="mr-2" /> Add New Salon
          </Button>
        }
      />

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search salons by name or slug..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[350px] bg-white rounded-3xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {salons?.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase())).map((salon: any) => {
            const daysLeft = getDaysLeft(salon.expires_at);
            return (
              <div key={salon.id} className="group bg-white rounded-3xl border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col overflow-hidden">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Building2 size={24} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                        salon.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {salon.is_active ? "Active" : "Inactive"}
                      </div>
                      {salon.sub_status === 'trial' && (
                        <div className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1",
                          salon.starts_at ? (daysLeft !== null && daysLeft <= 2 ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600") : "bg-amber-50 text-amber-600"
                        )}>
                          <Clock size={10} />
                          {salon.starts_at ? `${daysLeft}d Left` : "Pending"}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 line-clamp-1">{salon.name}</h3>
                  <p className="text-xs text-slate-400 font-medium mb-3">@{salon.slug}</p>
                  
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center text-xs text-slate-500">
                      <Mail size={12} className="mr-2 text-slate-400" />
                      <span className="truncate">{salon.email}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500">
                      <Phone size={12} className="mr-2 text-slate-400" />
                      <span>{salon.phone}</span>
                    </div>
                    {(salon.starts_at || salon.expires_at) && (
                      <div className="pt-1.5 mt-1 border-t border-slate-50 space-y-1.5">
                        {salon.starts_at && (
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center">
                              <CalendarDays size={12} className="mr-2 text-indigo-400" />
                              <span>Start</span>
                            </div>
                            <span className="font-medium text-slate-700">{formatDate(salon.starts_at)}</span>
                          </div>
                        )}
                        {salon.expires_at && (
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center">
                              <CalendarDays size={12} className="mr-2 text-rose-400" />
                              <span>Expires</span>
                            </div>
                            <span className={cn("font-medium", daysLeft !== null && daysLeft <= 3 ? "text-rose-600" : "text-slate-700")}>
                              {formatDate(salon.expires_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {renderFeatureGrid(salon)}
                </div>

                <div className="bg-slate-50/50 p-4 flex items-center justify-between border-t border-slate-100 group-hover:bg-white transition-colors">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedSalonForFeatures(salon); setIsFeaturesModalOpen(true); }} title="Manage Features">
                      <Shield size={14} className="text-indigo-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setViewingSalonUsersId(salon.id); setIsUsersModalOpen(true); }} title="View Staff">
                      <Users size={14} className="text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEnterSalon(salon.id)} title="Enter Salon Dashboard">
                      <LayoutDashboard size={14} className="text-indigo-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setViewingCredentials(salon); setIsCredentialsOpen(true); }} title="Credentials">
                      <Key size={14} className="text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingSalon(salon); setIsModalOpen(true); }}>
                      <Edit2 size={14} className="text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Import Data" onClick={() => { setImportSalon(salon); setImportTab('inventory'); setImportFile(null); setImportResult(null); }}>
                      <Upload size={14} className="text-emerald-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Temp Access" onClick={() => { setTempAccessSalon(salon); setTempCreds(null); }}>
                      <FlaskConical size={14} className="text-violet-600" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(salon.sub_status === 'trial' || salon.sub_status === 'active') && (
                      <Button
                        size="sm"
                        className="h-8 px-3 text-[10px] font-black uppercase tracking-tight bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-1"
                        onClick={() => {
                          const existingDate = salon.starts_at
                            ? (salon.starts_at.includes('T') ? salon.starts_at : salon.starts_at.replace(' ', 'T')).split('T')[0]
                            : new Date().toISOString().split('T')[0];
                          setStartDateSalonId(salon.id);
                          setStartDateSalon(salon);
                          setInputStartDate(existingDate);
                          setIsStartDateModalOpen(true);
                        }}
                      >
                        <CalendarDays size={12} />
                        {salon.starts_at ? 'Edit Dates' : 'Set Start'}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50" onClick={() => { setSelectedId(salon.id); setIsDeleteOpen(true); }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isStartDateModalOpen}
        onClose={() => setIsStartDateModalOpen(false)}
        title={`Subscription Start Date${startDateSalon ? ` — ${startDateSalon.name}` : ''}`}
        description="Set this once. The subscription renews automatically every month from this date."
        size="sm"
      >
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Start Date</label>
            <input
              type="date"
              value={inputStartDate}
              onChange={(e) => setInputStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
            />
          </div>

          {inputStartDate && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-2">Calculated Dates</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5"><CalendarDays size={13} className="text-indigo-400" /> Start</span>
                <span className="font-bold text-slate-800">{formatDate(inputStartDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5"><CalendarDays size={13} className="text-rose-400" /> Expires</span>
                <span className="font-bold text-indigo-700">
                  {formatDate((() => { const d = new Date(inputStartDate + 'T00:00:00'); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; })())}
                </span>
              </div>
              <p className="text-[10px] text-indigo-400 pt-1 border-t border-indigo-100">Monthly subscription cycle</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsStartDateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSetStartDate} loading={isSettingStartDate} disabled={!inputStartDate}>
              Save Dates
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isUsersModalOpen}
        onClose={() => {
          setIsUsersModalOpen(false);
          setViewingSalonUsersId(null);
        }}
        title="Salon Users"
        description="View all registered users and staff for this salon."
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoadingUsers ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : salonUsers?.data?.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {salonUsers.data.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      <UserCircle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-white border border-slate-200 text-indigo-600 shadow-sm">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm italic">No users found for this salon.</p>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSalon(null);
        }}
        title={editingSalon ? "Edit Salon" : "Add New Salon"}
        description={editingSalon ? "Update salon details and configuration." : "Create a new salon entity in the system."}
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Salon Name</label>
              <Input 
                {...register("name")} 
                placeholder="e.g. Glamour Studio" 
                error={errors.name?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">URL Slug</label>
              <Input 
                {...register("slug")} 
                placeholder="e.g. glamour-studio" 
                error={errors.slug?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <Input 
                {...register("email")} 
                type="email"
                placeholder="salon@example.com" 
                error={errors.email?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone Number</label>
              <Input 
                {...register("phone")} 
                placeholder="+94 77 123 4567" 
                error={errors.phone?.message}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Physical Address</label>
            <Input 
              {...register("address")} 
              placeholder="123 Main St, Colombo 07" 
              error={errors.address?.message}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Grace Period (Days)</label>
            <Input 
              type="number"
              {...register("grace_period_days")} 
              placeholder="e.g. 3" 
              error={errors.grace_period_days?.message}
            />
            <p className="text-[10px] text-slate-400">Number of days a salon can access the system after their subscription expires before being blocked.</p>
          </div>

          {!editingSalon && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Owner Full Name</label>
              <Input 
                {...register("owner_name")} 
                placeholder="e.g. John Doe" 
                error={errors.owner_name?.message}
              />
              <p className="text-[10px] text-slate-400">An owner account will be created automatically with this name.</p>
            </div>
          )}

          {editingSalon && (
            <div className="space-y-2 border-t pt-4">
              <label className="text-sm font-medium text-slate-700">Subscription Plan</label>
              {!editingSalon.plan_id && !editingSalon.sub_status ? (
                <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  This salon has no active subscription. Activate a trial first before changing the plan.
                </p>
              ) : (
                <>
                  <select
                    value={selectedPlanId ?? ""}
                    onChange={e => setSelectedPlanId(Number(e.target.value) || null)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="" disabled>Select a plan…</option>
                    {plans.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name || p.name}
                        {p.price ? ` — LKR ${Number(p.price).toLocaleString()}/mo` : ""}
                        {p.max_staff ? ` · ${p.max_staff >= 9999 ? "Unlimited" : p.max_staff} staff` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Current: <span className="font-bold text-slate-600">{editingSalon.plan_display_name || editingSalon.plan_name || "Unknown"}</span>
                    {" · "}Status: <span className="font-bold text-indigo-600 uppercase">{editingSalon.sub_status || "—"}</span>
                  </p>
                </>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              {...register("is_active")}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              This salon is active and can receive appointments
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isCreating || isUpdating || isChangingPlan}
            >
              {editingSalon ? "Save Changes" : "Create Salon"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCredentialsOpen}
        onClose={() => {
          setIsCredentialsOpen(false);
          setViewingCredentials(null);
        }}
        title="Salon Credentials"
        description="View and manage owner access for this salon."
      >
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Owner Email</label>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
              <span className="font-medium text-slate-700">{viewingCredentials?.email}</span>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(viewingCredentials?.email || "")}>
                <Copy size={16} className="text-slate-400" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password Management</label>
            {viewingCredentials?.newPassword ? (
              <div className="space-y-2">
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Key size={16} className="text-indigo-500 mr-2" />
                    <span className="font-mono text-sm font-bold text-indigo-600">{viewingCredentials.newPassword}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(viewingCredentials.newPassword)}>
                    <Copy size={16} className="text-slate-400" />
                  </Button>
                </div>
                <p className="text-[10px] text-amber-600 font-medium italic">
                  Note: This is a new temporary password. Please share it with the owner.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 p-6 rounded-xl text-center">
                <p className="text-sm text-slate-500 mb-4">Password is encrypted and cannot be viewed directly.</p>
                <Button 
                  onClick={handleResetPassword} 
                  loading={isResetting}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Reset & Generate New Password
                </Button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button className="w-full h-11" variant="secondary" onClick={() => setIsCredentialsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isFeaturesModalOpen}
        onClose={() => setIsFeaturesModalOpen(false)}
        title={`Feature Access: ${selectedSalonForFeatures?.name}`}
        description="Override the default plan features for this specific salon."
        size="md"
      >
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(FEATURE_ICONS).map(([key, { icon: Icon, label }]) => (
              <div 
                key={key} 
                className={cn(
                  "flex items-center p-4 rounded-2xl border transition-all cursor-pointer",
                  tempPermissions.includes(key) 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                )}
                onClick={() => handleTogglePermission(key)}
              >
                <div className="flex-1 flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl",
                    tempPermissions.includes(key) ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"
                  )}>
                    <Icon size={20} />
                  </div>
                  <span className="font-bold text-sm">{label}</span>
                </div>
                <Checkbox 
                  checked={tempPermissions.includes(key)} 
                  onChange={() => {}} // Handled by div click
                />
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-medium">
              Total Enabled: <span className="text-indigo-600 font-black">{tempPermissions.length} / {Object.keys(FEATURE_ICONS).length}</span>
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsFeaturesModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveFeatures} 
                loading={isUpdatingFeatures}
                className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
              >
                Save Permissions
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          if (selectedId) deleteSalon(selectedId, { onSuccess: () => setIsDeleteOpen(false) });
        }}
        title="Delete Salon?"
        description="This action cannot be undone. All data associated with this salon will be permanently removed."
        variant="danger"
        loading={isDeleting}
      />

      {/* Temp Access Modal */}
      <Modal
        isOpen={!!tempAccessSalon}
        onClose={() => { setTempAccessSalon(null); setTempCreds(null); }}
        title={`Temporary Access — ${tempAccessSalon?.name ?? ''}`}
        description="Create a disposable login account to inspect this salon's system. Revoke it when done."
        size="sm"
      >
        <div className="space-y-5 py-2">
          {!tempCreds ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto">
                <FlaskConical size={28} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This will create (or refresh) a temporary <span className="font-bold text-violet-700">salon_owner</span> account for this salon with a new random password.
                </p>
                <p className="text-xs text-amber-600 font-medium mt-2">Remember to revoke access when you're done.</p>
              </div>
              <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={handleCreateTempAccess} loading={tempAccessLoading}>
                Generate Temp Credentials
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-violet-700">
                <CheckCircle2 size={16} className="text-violet-500" /> Temporary account is active
              </div>

              {[
                { label: 'Login URL', value: tempCreds.login_url },
                { label: 'Email', value: tempCreds.email },
                { label: 'Password', value: tempCreds.password },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-sm font-mono font-bold text-slate-800 truncate">{value}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 ml-2" onClick={() => navigator.clipboard.writeText(value)}>
                      <Copy size={13} className="text-slate-400" />
                    </Button>
                  </div>
                </div>
              ))}

              <a href={tempCreds.login_url} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-bold hover:bg-violet-100 transition-colors">
                <ExternalLink size={14} /> Open Login Page
              </a>

              <div className="pt-2 border-t border-slate-100 flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => { setTempAccessSalon(null); setTempCreds(null); }}>Close</Button>
                <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleRevokeTempAccess} loading={revokeLoading}>
                  Revoke Access
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Import Data Modal */}
      <Modal
        isOpen={!!importSalon}
        onClose={() => { setImportSalon(null); setImportResult(null); setImportFile(null); }}
        title={`Import Data — ${importSalon?.name ?? ''}`}
        description="Upload a CSV file to bulk-import inventory, service categories, or services."
        size="lg"
      >
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {([
              { key: 'inventory',  label: 'Inventory',           icon: Package },
              { key: 'categories', label: 'Service Categories',  icon: Scissors },
              { key: 'services',   label: 'Services',            icon: Scissors },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setImportTab(key); setImportFile(null); setImportResult(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  importTab === key ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* CSV Format hint */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700 mb-1">Expected CSV columns:</p>
            {importTab === 'inventory'  && <code className="block">name, sku, cost_price, selling_price, stock_quantity, low_stock_alert</code>}
            {importTab === 'categories' && <code className="block">name</code>}
            {importTab === 'services'   && <code className="block">name, category_name, price, duration_minutes, description</code>}
            <button onClick={() => downloadTemplate(importTab)} className="mt-2 flex items-center gap-1 text-indigo-600 font-bold hover:underline">
              <Download size={12} /> Download sample template
            </button>
          </div>

          {/* File upload */}
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${
            importFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30'
          }`}>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
            />
            {importFile ? (
              <>
                <CheckCircle2 size={28} className="text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-emerald-700">{importFile.name}</p>
                <p className="text-xs text-emerald-500 mt-1">Click to change file</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-600">Click to upload CSV</p>
                <p className="text-xs text-slate-400 mt-1">Only .csv files supported</p>
              </>
            )}
          </label>

          {/* Result */}
          {importResult && (
            <div className={`rounded-xl p-4 border text-sm space-y-1 ${
              (importResult.errors?.length ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <p className="font-bold text-slate-800">
                <CheckCircle2 size={14} className="inline text-emerald-500 mr-1" />
                {importResult.imported} imported
                {importResult.skipped > 0 && <span className="text-slate-500 font-normal"> · {importResult.skipped} skipped</span>}
              </p>
              {(importResult.errors ?? []).map((e, i) => (
                <p key={i} className="text-xs text-rose-600 flex items-start gap-1">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => { setImportSalon(null); setImportResult(null); setImportFile(null); }}>Close</Button>
            <Button onClick={handleImport} disabled={!importFile || importLoading}>
              {importLoading ? <><Loader2 size={15} className="animate-spin mr-2" />Importing...</> : 'Import Now'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!newSalonCredentials}
        onClose={() => setNewSalonCredentials(null)}
        title="Salon Created Successfully!"
        description="A new salon and owner account have been provisioned. Please copy these credentials for the owner."
      >
        <div className="space-y-6 py-4">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start space-x-3">
            <div className="bg-emerald-500 text-white p-2 rounded-lg">
              <Building2 size={20} />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">Salon: {newSalonCredentials?.salon_name}</h4>
              <p className="text-emerald-700 text-xs">Access has been granted to the owner. A trial has started.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Owner Email</p>
                <p className="text-sm font-bold text-slate-900">{newSalonCredentials?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => navigator.clipboard.writeText(newSalonCredentials?.email || "")}
              >
                <Copy size={14} className="text-slate-400" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Generated Password</p>
                <p className="text-sm font-mono font-bold text-slate-900">{newSalonCredentials?.password}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => navigator.clipboard.writeText(newSalonCredentials?.password || "")}
              >
                <Copy size={14} className="text-slate-400" />
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button 
              className="w-full h-12 bg-slate-900"
              onClick={() => setNewSalonCredentials(null)}
            >
              Done, I have shared the credentials
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SalonsPage;
