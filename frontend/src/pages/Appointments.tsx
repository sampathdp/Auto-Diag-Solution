import { useState, useMemo, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  Calendar as CalendarIcon, Clock, CreditCard, Mail, MapPin, Phone, Plus, Search, Scissors, User as UserIcon, PlayCircle, CheckCircle2, ChevronDown, Filter 
} from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useApiQuery } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { useCustomers } from "@/hooks/useCustomers";
import { useServices } from "@/hooks/useServices";
import { useStaff } from "@/hooks/useStaff";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import Badge from "../components/ui/Badge";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";

const SERVICE_COLORS: Record<string, string> = {
  'Hair': '#10b981',      // Emerald
  'Facial': '#8b5cf6',    // Purple
  'Massage': '#f59e0b',   // Amber
  'Nails': '#06b6d4',     // Teal
  'Makeup': '#f43f5e',    // Rose
  'blocked': '#f43f5e',   // Blocked (same as Rose)
  'default': '#6366f1'    // Indigo
};

const getServiceColor = (serviceName: string = '', status: string = '') => {
  if (status === 'blocked') return SERVICE_COLORS.blocked;
  const name = serviceName || '';
  for (const [key, color] of Object.entries(SERVICE_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return SERVICE_COLORS.default;
};

const AppointmentsPage = () => {
  const { list, create, update } = useAppointments();
  const { list: listCustomers, create: createCustomer } = useCustomers();
  const { list: listServices } = useServices();
  const { list: listStaff } = useStaff();
  const { data: businessHours } = useApiQuery<any>(["business-hours"], "/business-hours");

  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const user = useAuthStore((state) => state.user);
  const [salonSlug, setSalonSlug] = useState(user?.salon_slug);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await apiClient.get("/branches");
      return res.data.data || [];
    },
  });

  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBlockedMode, setIsBlockedMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ first_name: "", last_name: "", phone: "", email: "" });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Create Form State
  const [formData, setFormData] = useState({
    customer_id: "",
    service_id: "",
    staff_id: "",
    branch_id: activeBranchId || "",
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: "09:00",
    end_time: "10:00",
    notes: ""
  });

  // Fetch salon slug if missing
  useEffect(() => {
    if (!salonSlug && user?.salon_id) {
      apiClient.get(`/salons/${user.salon_id}`).then(res => {
        setSalonSlug(res.data.data.slug);
      }).catch(() => {});
    }
  }, [user?.salon_id, salonSlug]);

  // Keep branch_id synchronized with global activeBranchId or single branch when opening form
  useEffect(() => {
    if (isCreateOpen) {
      if (activeBranchId) {
        setFormData((prev) => ({ ...prev, branch_id: activeBranchId }));
      } else if (Array.isArray(branches) && branches.length === 1) {
        setFormData((prev) => ({ ...prev, branch_id: String(branches[0].id) }));
      }
    }
  }, [isCreateOpen, activeBranchId, branches]);

  const [dateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  const activeHours = (Array.isArray(businessHours?.data) ? businessHours.data : [])?.filter((h: any) => h.is_open) || [];
  const minTime = activeHours.length > 0 
    ? activeHours.reduce((min: string, curr: any) => curr.open_time < min ? curr.open_time : min, "23:59:59")
    : "08:00:00";
  const maxTime = activeHours.length > 0 
    ? activeHours.reduce((max: string, curr: any) => curr.close_time > max ? curr.close_time : max, "00:00:00")
    : "20:00:00";

  const { data: appointments } = list(dateRange.start, dateRange.end, activeBranchId);
  const { data: customers } = listCustomers();
  const { data: services } = listServices();
  const { data: staff } = listStaff();
  
  const { mutate: createAppointment, isPending: isCreating } = create();
  const { mutateAsync: createCustomerAsync, isPending: isCreatingCustomer } = createCustomer();
  const { mutate: updateAppointment } = update(selectedApt?.id || 0);

  // Find selected service duration
  const selectedServiceDuration = useMemo(() => {
    if (!formData.service_id || !services) return 30; // default 30 mins
    const selected = services.find((s: any) => String(s.id) === String(formData.service_id));
    return selected ? parseInt(selected.duration_minutes || "30", 10) : 30;
  }, [formData.service_id, services]);

  // Recalculate end_time whenever start_time or service_id changes
  useEffect(() => {
    if (!formData.start_time) return;
    const [hours, minutes] = formData.start_time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    const endDate = new Date(date.getTime() + selectedServiceDuration * 60 * 1000);

    const endHours = String(endDate.getHours()).padStart(2, '0');
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
    setFormData((prev) => ({
      ...prev,
      end_time: `${endHours}:${endMinutes}`
    }));
  }, [formData.start_time, selectedServiceDuration]);

  // Fetch available slots
  useEffect(() => {
    if (isCreateOpen && salonSlug && formData.appointment_date && selectedServiceDuration > 0 && !isBlockedMode) {
      setIsLoadingSlots(true);
      apiClient.get(`/public/salons/${salonSlug}/availability`, {
        params: {
          date: formData.appointment_date,
          duration: selectedServiceDuration,
          staff_id: formData.staff_id
        }
      })
      .then(res => {
        setAvailableSlots(res.data.data || []);
      })
      .catch(() => {
        setAvailableSlots([]);
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });
    } else {
      setAvailableSlots([]);
    }
  }, [isCreateOpen, salonSlug, formData.appointment_date, selectedServiceDuration, formData.staff_id, isBlockedMode]);

  const events = useMemo(() => (Array.isArray(appointments) ? appointments.map((apt: any) => ({
    id: String(apt.id),
    title: apt.status === 'blocked' ? (apt.notes || "Blocked Time") : (apt.service_name || "Unspecified Service"),
    start: `${apt.appointment_date}T${apt.start_time}`,
    end: `${apt.appointment_date}T${apt.end_time}`,
    extendedProps: { ...apt },
    backgroundColor: getServiceColor(apt.service_name, apt.status),
    borderColor: 'transparent'
  })) : []), [appointments]);

  const [sidebarDate, setSidebarDate] = useState(new Date().toISOString().split('T')[0]);

  const upcomingAppointments = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) return [];
    return appointments
      .filter((apt: any) => apt.status !== 'cancelled' && apt.appointment_date === sidebarDate)
      .sort((a: any, b: any) => new Date(a.appointment_date + 'T' + a.start_time).getTime() - new Date(b.appointment_date + 'T' + b.start_time).getTime())
      .slice(0, 10);
  }, [appointments, sidebarDate]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleEventClick = (info: any) => {
    setSelectedApt(info.event.extendedProps);
    setIsDetailsOpen(true);
  };

  const handleConfirmReject = () => {
    updateAppointment({ status: 'cancelled' });
    setIsConfirmOpen(false);
    setIsDetailsOpen(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAppointment(formData, {
      onSuccess: () => {
        toast.success("Appointment booked successfully!");
        setIsCreateOpen(false);
        setFormData({
          customer_id: "",
          service_id: "",
          staff_id: "",
          branch_id: activeBranchId || "",
          appointment_date: new Date().toISOString().split('T')[0],
          start_time: "09:00",
          end_time: "10:00",
          notes: ""
        });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to book appointment");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Calendar" 
        description="Monitor and manage your salon bookings."
        action={
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary"
              onClick={() => {
                setIsBlockedMode(true);
                setIsCreateOpen(true);
              }}
              className="px-6 py-6 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Clock size={20} className="mr-2" />
              Block Time
            </Button>
            <Button 
              onClick={() => {
                setIsBlockedMode(false);
                setIsCreateOpen(true);
              }}
              className="shadow-indigo-200 shadow-lg px-6 py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus size={20} className="mr-2" />
              Book Appointment
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Panel */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Filter by Date</h3>
              <div className="relative">
                <CalendarIcon className="absolute left-3.5 top-3.5 text-indigo-500" size={18} />
                <input 
                  type="date" 
                  className="w-full pl-11 pr-4 py-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  value={sidebarDate}
                  onChange={(e) => setSidebarDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Schedule</h3>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {upcomingAppointments.map((apt: any) => {
                  const color = getServiceColor(apt.service_name, apt.status);
                  return (
                    <div 
                      key={apt.id}
                      onClick={() => { setSelectedApt(apt); setIsDetailsOpen(true); }}
                      className="group flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                    >
                      <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: color }}></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {apt.service_name || "Unspecified"}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-0.5">
                          <Clock size={12} className="text-slate-300" />
                          <span>{apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}</span>
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-slate-300 -rotate-90" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <h4 className="font-black text-lg leading-tight">Weekly<br />Insights</h4>
            <p className="text-white/70 text-xs mt-2 font-medium">You have {(appointments as any[])?.length || 0} appointments scheduled this week.</p>
            <Button variant="secondary" className="w-full mt-5 bg-white text-indigo-600 border-none hover:bg-indigo-50 font-bold py-5 rounded-xl">
              View Reports
            </Button>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="flex-1 min-w-0">
          <div className="bg-white p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.03)] min-h-[800px] calendar-modern">
            <style>{`
              .calendar-modern .fc {
                --fc-border-color: #f1f5f9;
                --fc-today-bg-color: transparent;
                font-family: 'Inter', sans-serif;
              }
              .calendar-modern .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 700 !important; color: #1e293b; }
              .calendar-modern .fc-button {
                background: white !important; border: 1px solid #e2e8f0 !important; color: #64748b !important;
                font-weight: 600 !important; border-radius: 12px !important; padding: 8px 18px !important; font-size: 0.8rem !important;
              }
              .calendar-modern .fc-button-primary:not(:disabled).fc-button-active { background: #4f46e5 !important; color: white !important; border-color: #4f46e5 !important; }
              .calendar-modern .fc-col-header-cell { padding: 12px 0 !important; border: none !important; }
              .calendar-modern .fc-col-header-cell-cushion {
                display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: center !important;
                gap: 8px !important; font-size: 0.75rem !important; font-weight: 700 !important; text-transform: uppercase !important;
                color: #94a3b8 !important; text-decoration: none !important;
              }
              .calendar-modern .fc-timegrid-slot { height: 5rem !important; border-bottom: 1px solid #f8fafc !important; }
              .calendar-modern .fc-timegrid-slot-label-cushion { font-size: 0.7rem !important; font-weight: 600 !important; color: #94a3b8 !important; }
              .calendar-modern .fc-v-event { background: white !important; border: none !important; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.08) !important; border-radius: 12px !important; padding: 0 !important; overflow: hidden !important; }
              .calendar-modern .fc-event-main { padding: 0 !important; height: 100% !important; }
              .calendar-modern .fc-timegrid-now-indicator-line { border-color: #f43f5e !important; border-width: 2px !important; }
              .calendar-modern .fc-timegrid-now-indicator-arrow { display: none !important; }
              .custom-scrollbar::-webkit-scrollbar { width: 4px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

              @media (max-width: 768px) {
                .calendar-modern {
                  padding: 1rem !important;
                }
                .calendar-modern .fc-header-toolbar {
                  display: flex !important;
                  flex-direction: column !important;
                  gap: 12px !important;
                  align-items: center !important;
                }
                .calendar-modern .fc-toolbar-chunk {
                  display: flex !important;
                  justify-content: center !important;
                  width: 100% !important;
                  flex-wrap: wrap !important;
                  gap: 6px !important;
                }
                .calendar-modern .fc-toolbar-title {
                  font-size: 1.1rem !important;
                  text-align: center !important;
                }
                .calendar-modern .fc-button {
                  padding: 6px 12px !important;
                  font-size: 0.75rem !important;
                }
                .calendar-modern .fc-timegrid-slot {
                  height: 4rem !important;
                }
                .calendar-modern .fc-timegrid-slot-label-cushion {
                  font-size: 0.65rem !important;
                }
                .calendar-modern .fc-v-event .event-time-marker {
                  display: none !important;
                }
                .calendar-modern .fc-v-event .py-2 {
                  padding-top: 2px !important;
                  padding-bottom: 2px !important;
                }
                .calendar-modern .fc-v-event h5 {
                  font-size: 10px !important;
                  margin-top: 2px !important;
                }
                .calendar-modern .fc-v-event p {
                  font-size: 9px !important;
                }
              }
            `}</style>
            <FullCalendar
              key={isMobile ? "mobile" : "desktop"}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              slotMinTime={minTime}
              slotMaxTime={maxTime}
              allDaySlot={false}
              nowIndicator={true}
              slotDuration="01:00:00"
              height="auto"
              eventClick={handleEventClick}
              eventContent={(eventInfo) => {
                const { event } = eventInfo;
                const props = event.extendedProps;
                const color = event.backgroundColor;
                return (
                  <div className="flex h-full w-full bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="w-1.5 h-full shrink-0" style={{ backgroundColor: color }}></div>
                    <div className="p-3 flex flex-col justify-between flex-1 min-w-0 relative">
                      {/* Status Dot */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        {props.status === 'confirmed' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Confirmed"></div>}
                        {props.status === 'cancelled' && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" title="Cancelled"></div>}
                        {props.status === 'pending' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Pending"></div>}
                        {(props.status === 'started' || props.status === 'in_progress') && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" title="In Progress"></div>}
                      </div>

                      {/* Top Time Marker */}
                      <div className="absolute top-1 left-3 right-7 flex items-center gap-2 opacity-60 event-time-marker">
                        <span className="text-[8px] font-black text-slate-400 tabular-nums">{props.start_time?.slice(0, 5) || "--:--"}</span>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                      </div>

                      <div className="py-2">
                        <h5 className="font-bold text-slate-900 text-[12px] truncate leading-tight">{event.title}</h5>
                        <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{props.customer_name}</p>
                      </div>

                      {/* Bottom Time Marker */}
                      <div className="absolute bottom-1 left-3 right-3 flex items-center gap-2 opacity-60 event-time-marker">
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                        <span className="text-[8px] font-black text-slate-400 tabular-nums">{props.end_time?.slice(0, 5) || "--:--"}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
              dayHeaderContent={(args) => {
                const date = args.date;
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = date.getDate();
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div className="flex flex-col items-center gap-1 py-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayName}</span>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                      isToday ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "text-slate-900"
                    )}>
                      {dayNum}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      <Modal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        title={selectedApt?.status === 'blocked' ? "Blocked Time Details" : "Appointment Details"}
      >
        {selectedApt && (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                    selectedApt.status === 'blocked' ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
                )}>
                  {selectedApt.status === 'blocked' ? "B" : (selectedApt.customer_name?.[0] || "C")}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {selectedApt.status === 'blocked' ? (selectedApt.notes || "Personal Time Blocked") : selectedApt.customer_name}
                  </h4>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 mt-1">
                    {selectedApt.status === 'blocked' ? (
                        <span>Manual Management Block</span>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5">
                                <Phone size={12} className="text-slate-400" />
                                <span>{selectedApt.customer_phone || "No phone provided"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Mail size={12} className="text-slate-400" />
                                <span className="truncate max-w-[200px]" title={selectedApt.customer_email}>{selectedApt.customer_email || "No email address"}</span>
                            </div>
                        </>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant={
                selectedApt.status === 'completed' ? 'success' : 
                (selectedApt.status === 'confirmed' || selectedApt.status === 'in_progress') ? 'success' : 
                selectedApt.status === 'blocked' ? 'danger' : 'warning'
              } className={
                selectedApt.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' : 
                selectedApt.status === 'completed' ? 'bg-teal-100 text-teal-700' : ''
              }>
                {selectedApt.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service</p>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl">
                  <Scissors size={14} className="text-indigo-500" />
                  {selectedApt.service_name}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Staff</p>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl">
                  <UserIcon size={14} className="text-indigo-500" />
                  {selectedApt.staff_name}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Slot</p>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl">
                  <Clock size={14} className="text-indigo-500" />
                  {selectedApt.start_time?.slice(0, 5) || "??:??"} - {selectedApt.end_time?.slice(0, 5) || "??:??"}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Price</p>
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl">
                  <CreditCard size={14} />
                  LKR {parseFloat(selectedApt.total_amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
            
            {(selectedApt.actual_start_time || selectedApt.actual_end_time) && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Job Execution Details</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                      <PlayCircle size={12} className="text-emerald-500" />
                      Started At
                    </div>
                    <div className="text-sm font-black text-slate-700">
                      {selectedApt.actual_start_time ? new Date(selectedApt.actual_start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                      <CheckCircle2 size={12} className="text-indigo-500" />
                      Finished At
                    </div>
                    <div className="text-sm font-black text-slate-700">
                      {selectedApt.actual_end_time ? new Date(selectedApt.actual_end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                      <Clock size={12} className="text-amber-500" />
                      Duration
                    </div>
                    <div className="text-sm font-black text-slate-700">
                      {selectedApt.actual_start_time && selectedApt.actual_end_time ? 
                        Math.round((new Date(selectedApt.actual_end_time).getTime() - new Date(selectedApt.actual_start_time).getTime()) / 60000) + " min" 
                        : "Ongoing"}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-4 flex gap-3">
              <Button variant="secondary" className="px-6 flex-1" onClick={() => setIsDetailsOpen(false)}>Close</Button>
              {selectedApt.status !== 'blocked' && (
                <div className="flex-[2] flex gap-3">
                  {selectedApt.status !== 'cancelled' && selectedApt.status !== 'completed' && (
                    <Button 
                      variant="danger" 
                      className="flex-1" 
                      onClick={() => setIsConfirmOpen(true)}
                    >
                      {selectedApt.status === 'pending' ? 'Reject' : 'Cancel'}
                    </Button>
                  )}
                  {selectedApt.status === 'pending' && (
                    <Button className="flex-1" onClick={() => { updateAppointment({ status: 'confirmed' }); setIsDetailsOpen(false); }}>
                      Confirm
                    </Button>
                  )}
                  {selectedApt.status === 'confirmed' && (
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md shadow-emerald-500/20" onClick={() => { updateAppointment({ status: 'in_progress' }); setIsDetailsOpen(false); }}>
                      Start Job
                    </Button>
                  )}
                  {selectedApt.status === 'in_progress' && (
                    <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md shadow-indigo-500/20" onClick={() => { updateAppointment({ status: 'completed' }); setIsDetailsOpen(false); }}>
                      Finish Job
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Appointment Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setIsNewCustomer(false); setNewCustomerData({ first_name: "", last_name: "", phone: "", email: "" }); }}
        title={isBlockedMode ? "Block Staff Time" : "New Appointment"}
      >
        <form onSubmit={async (e) => {
            e.preventDefault();
            let customerId = formData.customer_id;

            if (!isBlockedMode && isNewCustomer) {
                try {
                    const res = await createCustomerAsync({
                        name: `${newCustomerData.first_name} ${newCustomerData.last_name}`.trim(),
                        phone: newCustomerData.phone,
                        email: newCustomerData.email || undefined
                    });
                    customerId = res.data?.data?.id || res.data?.id;
                } catch {
                    return;
                }
            }

            const finalData = {
                ...formData,
                customer_id: isBlockedMode ? null : customerId,
                service_id: isBlockedMode ? null : formData.service_id,
                status: isBlockedMode ? 'blocked' : 'pending',
            };

            createAppointment(finalData, {
                onSuccess: () => {
                    toast.success(isBlockedMode ? "Time blocked successfully!" : "Appointment booked successfully!");
                    setIsCreateOpen(false);
                    setIsNewCustomer(false);
                    setNewCustomerData({ first_name: "", last_name: "", phone: "", email: "" });
                    setFormData({
                        customer_id: "",
                        service_id: "",
                        staff_id: "",
                        branch_id: activeBranchId || "",
                        appointment_date: new Date().toISOString().split('T')[0],
                        start_time: "09:00",
                        end_time: "10:00",
                        notes: ""
                    });
                },
                onError: (err: any) => {
                    toast.error(err.message || "Failed to process request");
                }
            });
        }} className="space-y-5 py-2">
          <div className="space-y-4">
            {!isBlockedMode ? (
                <>
                    {Array.isArray(branches) && branches.length > 1 && (
                      <Select 
                        label="Select Branch Location"
                        required
                        value={formData.branch_id}
                        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                        options={[
                          { label: "Choose Branch...", value: "" },
                          ...(Array.isArray(branches) ? branches.map((b: any) => ({ label: b.name, value: b.id })) : [])
                        ]}
                      />
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {isNewCustomer ? "New Customer" : "Select Customer"}
                        </label>
                        <button
                          type="button"
                          onClick={() => { setIsNewCustomer(!isNewCustomer); setFormData({ ...formData, customer_id: "" }); setNewCustomerData({ first_name: "", last_name: "", phone: "", email: "" }); }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          {isNewCustomer ? "← Select existing" : "+ New customer"}
                        </button>
                      </div>
                      {isNewCustomer ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="First Name"
                              required
                              value={newCustomerData.first_name}
                              onChange={(e) => setNewCustomerData({ ...newCustomerData, first_name: e.target.value })}
                            />
                            <Input
                              label="Last Name"
                              required
                              value={newCustomerData.last_name}
                              onChange={(e) => setNewCustomerData({ ...newCustomerData, last_name: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Phone Number"
                              required
                              value={newCustomerData.phone}
                              onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                            />
                            <Input
                              label="Email (Optional)"
                              type="email"
                              value={newCustomerData.email}
                              onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <Select
                          label=""
                          required
                          value={formData.customer_id}
                          onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                          options={[
                            { label: "Select a customer...", value: "" },
                            ...(Array.isArray(customers) ? customers.map((c: any) => ({ label: c.phone ? `${c.name} — ${c.phone}` : c.name, value: c.id })) : [])
                          ]}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    <Select 
                        label="Select Service"
                        required
                        value={formData.service_id}
                        onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                        options={[
                        { label: "Select service...", value: "" },
                        ...(Array.isArray(services) ? services.map((s: any) => ({ label: s.name, value: s.id })) : [])
                        ]}
                    />
                    <Select 
                        label="Assigned Staff"
                        required
                        value={formData.staff_id}
                        onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                        options={[
                        { label: "Select staff...", value: "" },
                        ...(Array.isArray(staff) ? staff.map((s: any) => ({ label: s.name, value: s.id })) : [])
                        ]}
                    />
                    </div>
                </>
            ) : (
                <Select 
                    label="Select Staff Member to Block"
                    required
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    options={[
                        { label: "Choose...", value: "" },
                        { label: "All Staff Members", value: "all" },
                        ...(Array.isArray(staff) ? staff.map((s: any) => ({ label: s.name, value: s.id })) : [])
                    ]}
                />
            )}

            <Input 
              label="Date"
              type="date"
              required
              value={formData.appointment_date}
              onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
            />

            {!isBlockedMode && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 block">
                  Available Time Slots
                </label>
                {isLoadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 font-bold border border-slate-100">
                    {!formData.service_id
                      ? "Please select a service above to view slots."
                      : "No slots available for this date. Try another date or stylist."}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {availableSlots.map((slot: any) => {
                      const isSelected = formData.start_time.slice(0, 5) === slot.time.slice(0, 5);
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.is_available}
                          onClick={() => setFormData({ ...formData, start_time: slot.time.slice(0, 5) })}
                          className={cn(
                            "h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                            isSelected
                              ? "bg-indigo-600 text-white border-transparent shadow-md"
                              : slot.is_available
                              ? "bg-slate-50 border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 text-slate-700"
                              : "bg-slate-50/50 border-transparent text-slate-300 cursor-not-allowed opacity-50"
                          )}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Start Time"
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
              <Input 
                label="End Time"
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                {isBlockedMode ? "Reason / Note (e.g. Lunch Break)" : "Notes"}
              </label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[100px]"
                placeholder={isBlockedMode ? "Why is this time blocked?" : "Special requests or notes..."}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => { setIsCreateOpen(false); setIsNewCustomer(false); setNewCustomerData({ first_name: "", last_name: "", phone: "", email: "" }); }}>Cancel</Button>
            <Button className="flex-1" type="submit" loading={isCreating || isCreatingCustomer}>
              {isBlockedMode ? "Block Time" : "Book Appointment"}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmReject}
        title="Reject Appointment"
        description="Are you sure you want to reject this appointment? This action will cancel the booking."
        confirmText="Yes, Reject"
        cancelText="No, Keep it"
        variant="danger"
      />
    </div>
  );
};

export default AppointmentsPage;
