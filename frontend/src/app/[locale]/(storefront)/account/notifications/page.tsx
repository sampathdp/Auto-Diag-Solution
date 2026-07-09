"use client";

import { useState, useEffect } from "react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/Button";
import { Loader2, Mail, MessageSquare, Smartphone, Bell, Save } from "lucide-react";
import apiClient from "@/lib/api/client";
import toast from "react-hot-toast";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";

interface NotificationPreferences {
  email_orders: boolean;
  email_promotions: boolean;
  sms_orders: boolean;
  sms_promotions: boolean;
  whatsapp_updates: boolean;
  push_notifications: boolean;
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_orders: true,
    email_promotions: false,
    sms_orders: true,
    sms_promotions: false,
    whatsapp_updates: false,
    push_notifications: false,
  });
  
  const [originalPrefs, setOriginalPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/account/notifications/preferences')
      .then(res => {
        // Ensure defaults if mock API doesn't have all fields
        const loadedPrefs = {
          email_orders: res.data.email_orders ?? true,
          email_promotions: res.data.email_promotions ?? false,
          sms_orders: res.data.sms_orders ?? true,
          sms_promotions: res.data.sms_promotions ?? false,
          whatsapp_updates: res.data.whatsapp_updates ?? false,
          push_notifications: res.data.push_notifications ?? false,
        };
        setPrefs(loadedPrefs);
        setOriginalPrefs(loadedPrefs);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load preferences");
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty = originalPrefs !== null && JSON.stringify(prefs) !== JSON.stringify(originalPrefs);
  
  useUnsavedChangesGuard(isDirty);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/account/notifications/preferences', prefs);
      setOriginalPrefs(prefs);
      toast.success("Preferences updated successfully");
    } catch (err) {
      toast.error("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AccountPageHeader title="Notification Preferences" subtitle="Manage how we contact you" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccountPageHeader 
        title="Notification Preferences" 
        subtitle="Manage how and when we contact you regarding orders and promotions." 
      />

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        
        {/* Order Updates */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold mb-1">Order Updates</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Receive updates about your order status, tracking links, and delivery confirmations.
          </p>
          <div className="flex flex-wrap gap-4">
            <ToggleOption 
              icon={<Mail className="h-4 w-4" />} 
              label="Email" 
              checked={prefs.email_orders} 
              onToggle={() => handleToggle('email_orders')} 
            />
            <ToggleOption 
              icon={<MessageSquare className="h-4 w-4" />} 
              label="SMS" 
              checked={prefs.sms_orders} 
              onToggle={() => handleToggle('sms_orders')} 
            />
            <ToggleOption 
              icon={<Smartphone className="h-4 w-4" />} 
              label="WhatsApp" 
              checked={prefs.whatsapp_updates} 
              onToggle={() => handleToggle('whatsapp_updates')} 
            />
          </div>
        </div>

        {/* Promotions and Offers */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold mb-1">Promotions & Offers</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get early access to sales, special discounts, and personalized offers.
          </p>
          <div className="flex flex-wrap gap-4">
            <ToggleOption 
              icon={<Mail className="h-4 w-4" />} 
              label="Email" 
              checked={prefs.email_promotions} 
              onToggle={() => handleToggle('email_promotions')} 
            />
            <ToggleOption 
              icon={<MessageSquare className="h-4 w-4" />} 
              label="SMS" 
              checked={prefs.sms_promotions} 
              onToggle={() => handleToggle('sms_promotions')} 
            />
          </div>
        </div>

        {/* System Notifications */}
        <div className="p-6">
          <h3 className="text-lg font-bold mb-1">Push Notifications</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Allow your browser to send you real-time push notifications.
          </p>
          <div className="flex flex-wrap gap-4">
            <ToggleOption 
              icon={<Bell className="h-4 w-4" />} 
              label="Browser Push" 
              checked={prefs.push_notifications} 
              onToggle={() => handleToggle('push_notifications')} 
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-muted/30 p-4 border-t flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!isDirty || saving}
            className="w-full sm:w-32"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
          </Button>
        </div>

      </div>
    </div>
  );
}

function ToggleOption({ 
  icon, 
  label, 
  checked, 
  onToggle 
}: { 
  icon: React.ReactNode, 
  label: string, 
  checked: boolean, 
  onToggle: () => void 
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors w-full sm:w-[200px]">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${checked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-sm font-semibold leading-none">{label}</span>
      </div>
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={onToggle} 
        />
        <div className={`block h-5 w-9 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
        <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
    </label>
  );
}
