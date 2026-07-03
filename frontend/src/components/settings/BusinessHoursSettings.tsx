import { useState, useEffect } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/Button";
import SalonSwitch from "../ui/SalonSwitch";
import { Clock, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const BusinessHoursSettings = () => {
  const { data: initialData, isLoading, refetch } = useApiQuery<any>(
    ["business-hours"],
    "/business-hours"
  );

  const { mutate: updateHours, isPending } = useApiMutation(
    (payload: any) => apiClient.post("/business-hours", payload),
    "Business hours updated!"
  );

  const [days, setDays] = useState<any[]>([]);

  useEffect(() => {
    if (initialData?.data) {
      setDays(initialData.data);
    }
  }, [initialData]);

  const handleToggle = (dayIndex: number) => {
    setDays(prev => prev.map(d => 
      d.day_of_week === dayIndex ? { ...d, is_open: !d.is_open } : d
    ));
  };

  const handleTimeChange = (dayIndex: number, field: string, value: string) => {
    setDays(prev => prev.map(d => 
      d.day_of_week === dayIndex ? { ...d, [field]: value } : d
    ));
  };

  const handleSave = () => {
    updateHours({ days }, { onSuccess: () => refetch() });
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading business hours...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Business Hours</h3>
          <p className="text-sm text-slate-500">Configure your salon's opening and closing times for each day.</p>
        </div>
        <Button onClick={handleSave} loading={isPending} className="shadow-indigo-200 shadow-lg">
          <Save size={18} className="mr-2" />
          Save Business Hours
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-50">
          {days.map((day, idx) => (
            <div key={day.day_of_week} className={cn(
              "p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
              day.is_open ? "bg-white" : "bg-slate-50/50"
            )}>
              <div className="flex items-center gap-4 min-w-[150px]">
                <SalonSwitch 
                  checked={!!day.is_open} 
                  onCheckedChange={() => handleToggle(day.day_of_week)}
                />
                <span className={cn(
                  "font-bold transition-colors",
                  day.is_open ? "text-slate-900" : "text-slate-400"
                )}>
                  {DAYS[day.day_of_week]}
                </span>
              </div>

              {day.is_open ? (
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="time" 
                      value={day.open_time}
                      onChange={(e) => handleTimeChange(day.day_of_week, 'open_time', e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"
                    />
                  </div>
                  <span className="text-slate-300 font-bold">to</span>
                  <div className="relative flex-1">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="time" 
                      value={day.close_time}
                      onChange={(e) => handleTimeChange(day.day_of_week, 'close_time', e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    Closed
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessHoursSettings;
