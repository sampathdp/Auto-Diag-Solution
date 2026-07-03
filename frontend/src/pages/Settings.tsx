import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { PaymentSettings } from "@/components/settings/PaymentSettings";
import BusinessHoursSettings from "@/components/settings/BusinessHoursSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { BranchSettings } from "@/components/settings/BranchSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SmsMarketing } from "@/components/settings/SmsMarketing";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { Save, Globe, Clock, CreditCard, Bell, FileText, QrCode, Palette, Sparkles, Store, Lock, MessageSquare, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const tabs = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'branches', label: 'Branch Locations', icon: Store, required_plan: ['professional', 'enterprise'] },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'subscription', label: 'Subscription Plan', icon: Sparkles },
  { id: 'hours', label: 'Business Hours', icon: Clock },
  { id: 'finance', label: 'Financial Rules', icon: CreditCard },
  { id: 'payments', label: 'Payments', icon: QrCode },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'sms_marketing', label: 'SMS Marketing', icon: MessageSquare, required_plan: ['professional', 'enterprise'] },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const user = useAuthStore((state) => state.user);
  const { list, save } = useSettings();
  const { data, isLoading } = list();
  const settings = data as any;
  const { mutate: saveSettings, isPending } = save();

  // General Settings States
  const [salonName, setSalonName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Colombo");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");

  // Finance Settings States
  const [taxRate, setTaxRate] = useState<number>(0);

  // Sync state from fetched data
  useEffect(() => {
    if (settings) {
      setSalonName(settings.salon_name || "");
      setTimezone(settings.timezone || "Asia/Colombo");
      setPhone(settings.phone || "");
      setEmail(settings.email || "");
      setSlug(settings.slug || "");
      setAddress(settings.address || "");
      setTaxRate(Number(settings.tax_rate) || 0);
    }
  }, [settings]);

  const handleSaveGeneral = () => {
    saveSettings({
      salon_name: salonName,
      timezone: timezone,
      phone: phone,
      email: email,
      slug: slug,
      address: address
    });
  };

  const handleSaveFinance = () => {
    saveSettings({
      currency: 'LKR',
      tax_rate: taxRate
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="System Settings" 
        description="Configure your salon's operational parameters, localization, and automated workflows."
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="w-full lg:w-64 space-y-1">
          {tabs.map((tab) => {
            const plan = (user?.plan_name || 'starter').toLowerCase();
            const isLocked = (tab as any).required_plan && !(tab as any).required_plan.includes(plan);

            return (
              <button
                key={tab.id}
                onClick={() => !isLocked && setActiveTab(tab.id)}
                className={cn(
                  "group flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium relative",
                  activeTab === tab.id 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
                  isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-500"
                )}
                title={isLocked ? "Requires Professional Plan" : ""}
              >
                <div className="flex items-center space-x-3">
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </div>
                {isLocked && <Lock size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />}
              </button>
            );
          })}
        </aside>

        {/* Settings Content */}
        <div className={cn(
          "flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm",
          ['appearance', 'subscription', 'branches', 'notifications'].includes(activeTab) ? "p-0 bg-transparent border-none shadow-none" : "p-8"
        )}>
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-4">General Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input 
                    label="Salon Name" 
                    value={salonName} 
                    onChange={(e) => setSalonName(e.target.value)} 
                    placeholder="Enter salon name"
                    required
                  />
                </div>
                <div>
                  <Select 
                    label="Timezone"
                    options={[
                      { label: "Asia/Colombo (GMT+5:30)", value: "Asia/Colombo" },
                      { label: "UTC", value: "UTC" }
                    ]} 
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
                <div>
                  <Input 
                    label="Contact / Phone Number" 
                    type="tel"
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="e.g. +94771234567"
                  />
                </div>
                <div>
                  <Input 
                    label="Email Address" 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="e.g. contact@salon.com"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Web Booking Link</label>
                  <div className="flex rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden transition-all">
                    <span className="bg-slate-50 px-3 flex items-center text-slate-500 text-sm border-r border-slate-200 select-none font-medium">
                      /book/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      placeholder="salon-slug"
                      className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm focus-visible:outline-none placeholder:text-slate-400 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                    This is your unique public booking address. Only letters, numbers, hyphens, and underscores are allowed.
                  </p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Textarea 
                    label="Physical Address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Enter physical address"
                    rows={3}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button onClick={handleSaveGeneral} loading={isPending}>
                  <Save size={18} className="mr-2" /> Save General Settings
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'branches' && (
            <BranchSettings />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSettings 
              salonData={settings} 
            />
          )}

          {activeTab === 'subscription' && (
            <SubscriptionSettings 
              salonData={settings} 
            />
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-4">Financial & Tax Rules</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Primary Currency</label>
                  <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium">
                    Sri Lankan Rupee (LKR)
                  </div>
                </div>
                <div>
                  <Input 
                    label="Default Tax Rate (%)"
                    type="number" 
                    value={taxRate} 
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button onClick={handleSaveFinance} loading={isPending}>
                  <Save size={18} className="mr-2" /> Save Finance Settings
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'payments' && <PaymentSettings />}

          {activeTab === 'hours' && <BusinessHoursSettings />}

          {activeTab === 'notifications' && (
            <NotificationSettings salonData={settings} />
          )}

          {activeTab === 'sms_marketing' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <SmsMarketing />
            </div>
          )}

          {activeTab === 'security' && <SecuritySettings />}

          {activeTab === 'invoices' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Clock size={40} className="text-slate-300" />
              </div>
              <h4 className="text-slate-900 font-bold">More Settings Coming Soon</h4>
              <p className="text-slate-500 text-sm max-w-xs mt-1">This section is currently being finalized. Check back soon for advanced configuration options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
