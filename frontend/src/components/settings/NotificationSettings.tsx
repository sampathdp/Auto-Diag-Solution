import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useSettings } from "@/hooks/useSettings";
import { useApiMutation } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import { 
  MessageSquare, Key, Send, Smartphone, ExternalLink, 
  CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, Bell, BellRing, Mail
} from "lucide-react";

export const NotificationSettings = ({ salonData }: { salonData: any }) => {
  const { save } = useSettings();
  const { mutate: saveSettings, isPending: isSaving } = save();

  const activePlan = salonData?.plan_name || "starter";
  const isTrialActive = salonData?.sub_status === "trial" && (!salonData?.expires_at || new Date(salonData.expires_at.includes(' ') ? salonData.expires_at.replace(' ', 'T') : salonData.expires_at) >= new Date());
  const isSmsAllowed = isTrialActive || activePlan.toLowerCase() !== "starter";

  // Local state for SMS configuration
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [senderId, setSenderId] = useState("");

  // Triggers state
  const [onBooking, setOnBooking] = useState(false);
  const [onReminder, setOnReminder] = useState(false);
  const [onPayment, setOnPayment] = useState(false);

  // Local state for Email configuration
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailOnBooking, setEmailOnBooking] = useState(false);
  const [emailOnReminder, setEmailOnReminder] = useState(false);
  const [emailBookingSubject, setEmailBookingSubject] = useState("");
  const [emailBookingTemplate, setEmailBookingTemplate] = useState("");
  const [emailReminderSubject, setEmailReminderSubject] = useState("");
  const [emailReminderTemplate, setEmailReminderTemplate] = useState("");

  // Test SMS state
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from your salon booking system.");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state from loaded settings
  useEffect(() => {
    if (salonData) {
      setSmsEnabled(isSmsAllowed ? (salonData.sms_enabled === "1") : false);
      setApiKey(salonData.sms_gateway_api_key || "");
      setSenderId(salonData.sms_gateway_sender_id || "");
      setOnBooking(salonData.sms_on_booking === "1");
      setOnReminder(salonData.sms_on_reminder === "1");
      setOnPayment(salonData.sms_on_payment === "1");

      setEmailEnabled(salonData.email_enabled === "1");
      setEmailOnBooking(salonData.email_on_booking === "1");
      setEmailOnReminder(salonData.email_on_reminder === "1");
      setEmailBookingSubject(salonData.email_booking_subject || "Appointment Booking Confirmed!");
      setEmailBookingTemplate(salonData.email_booking_template || "Hello {customer_name},\n\nYour appointment at {salon_name} has been successfully booked.\n\nDetails:\nDate: {appointment_date}\nTime: {appointment_time}\nService: {service_name}\n\nThank you for choosing us!\nBest regards,\n{salon_name}");
      setEmailReminderSubject(salonData.email_reminder_subject || "Appointment Reminder - {salon_name}");
      setEmailReminderTemplate(salonData.email_reminder_template || "Hello {customer_name},\n\nThis is a friendly reminder that you have an upcoming appointment at {salon_name} in 1 hour.\n\nDetails:\nDate: {appointment_date}\nTime: {appointment_time}\nService: {service_name}\n\nWe look forward to seeing you!\nBest regards,\n{salon_name}");
    }
  }, [salonData, isSmsAllowed]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      sms_enabled: (smsEnabled && isSmsAllowed) ? "1" : "0",
      sms_gateway_api_key: apiKey,
      sms_gateway_sender_id: senderId,
      sms_on_booking: onBooking ? "1" : "0",
      sms_on_reminder: onReminder ? "1" : "0",
      sms_on_payment: onPayment ? "1" : "0",

      email_enabled: emailEnabled ? "1" : "0",
      email_on_booking: emailOnBooking ? "1" : "0",
      email_on_reminder: emailOnReminder ? "1" : "0",
      email_booking_subject: emailBookingSubject,
      email_booking_template: emailBookingTemplate,
      email_reminder_subject: emailReminderSubject,
      email_reminder_template: emailReminderTemplate,
    };

    saveSettings(data, {
      onSuccess: () => {
        toast.success("Notification settings saved successfully!");
      },
      onError: () => {
        toast.error("Failed to save settings.");
      }
    });
  };

  const handleTestSms = async () => {
    if (!testNumber) {
      toast.error("Please enter a recipient phone number.");
      return;
    }
    if (!apiKey || !senderId) {
      toast.error("API Key and Sender ID are required to run a connection test.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await apiClient.post("/settings/test-sms", {
        api_key: apiKey,
        sender_id: senderId,
        recipient: testNumber,
        message: testMessage,
      });

      if (response.data?.success) {
        setTestResult({
          success: true,
          message: response.data?.message || "Test SMS sent successfully!"
        });
        toast.success("Test SMS sent successfully!");
      } else {
        setTestResult({
          success: false,
          message: response.data?.message || "Failed to send test SMS."
        });
        toast.error("Test SMS failed. Check credentials.");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Network error. Please try again.";
      setTestResult({
        success: false,
        message: errorMsg
      });
      toast.error("SMS test request failed.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pr-8 pointer-events-none">
          <BellRing size={180} />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <BellRing size={12} /> Salon Notification Manager
          </div>
          <h3 className="text-2xl font-black tracking-tight">Automate Customer Notifications</h3>
          <p className="text-sm text-indigo-200/90 leading-relaxed">
            Keep your clients engaged and reduce no-shows by configuring automated SMS reminders using text.lk or customizable email notifications.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <a 
              href="https://text.lk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-indigo-950 font-bold px-5 py-3 rounded-2xl text-xs hover:bg-indigo-50 transition-all hover:scale-105 shadow-md"
            >
              Get text.lk API Credentials <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SMS Toggle Switch */}
        <div className={cn(
          "flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border transition-all gap-4",
          isSmsAllowed 
            ? "bg-slate-50 border-slate-200" 
            : "bg-slate-50/50 border-slate-200/60 opacity-90"
        )}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl transition-all ${smsEnabled && isSmsAllowed ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              <Smartphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-900 text-base">Enable SMS Notifications</h4>
                {!isSmsAllowed && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-200 shadow-sm">
                    🔒 Upgrade to Unlock
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">Activate SMS dispatches for client notifications and alerts.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isSmsAllowed && (
              <span className="text-xs text-amber-700 font-bold max-w-xs text-right hidden md:inline">
                Unlock SMS settings on Professional or Enterprise plans.
              </span>
            )}
            <label className={cn(
              "relative inline-flex items-center",
              isSmsAllowed ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            )}>
              <input 
                type="checkbox" 
                checked={smsEnabled && isSmsAllowed} 
                onChange={(e) => isSmsAllowed && setSmsEnabled(e.target.checked)}
                disabled={!isSmsAllowed}
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {smsEnabled && (
          <>
            {/* API Credentials Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
              <div className="flex items-center space-x-3 border-b pb-4">
                <Key className="text-indigo-600" size={20} />
                <div>
                  <h4 className="font-bold text-slate-900">text.lk API Details</h4>
                  <p className="text-xs text-slate-500">Provide your Text.lk API credentials to authenticate SMS delivery.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                    text.lk API Token
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste your Bearer Token from text.lk"
                      className="w-full pl-4 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Input 
                    label="Sender ID" 
                    value={senderId} 
                    onChange={(e) => setSenderId(e.target.value)}
                    placeholder="e.g. SALONFLOW (Must be approved on text.lk)" 
                    required
                  />
                </div>
              </div>
            </div>

            {/* Triggers configuration */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
              <div className="flex items-center space-x-3 border-b pb-4">
                <Bell className="text-indigo-600" size={20} />
                <div>
                  <h4 className="font-bold text-slate-900">SMS Notification Triggers</h4>
                  <p className="text-xs text-slate-500">Select when the system should automatically send text messages to clients.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Trigger 1: Confirmed */}
                <div 
                  onClick={() => setOnBooking(!onBooking)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${onBooking ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Triggers</span>
                    <input 
                      type="checkbox" 
                      checked={onBooking}
                      onChange={() => {}} // Handled by outer click
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1">Appointment Booked</h5>
                  <p className="text-xs text-slate-500 font-medium">Sends an instant booking confirmation containing date, time, and service details.</p>
                </div>

                {/* Trigger 2: Reminder */}
                <div 
                  onClick={() => setOnReminder(!onReminder)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${onReminder ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Triggers</span>
                    <input 
                      type="checkbox" 
                      checked={onReminder}
                      onChange={() => {}}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1">24h Reminder Alert</h5>
                  <p className="text-xs text-slate-500 font-medium">Sends a friendly reminder to clients 24 hours prior to their session to prevent no-shows.</p>
                </div>

                {/* Trigger 3: Payment */}
                <div 
                  onClick={() => setOnPayment(!onPayment)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${onPayment ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Triggers</span>
                    <input 
                      type="checkbox" 
                      checked={onPayment}
                      onChange={() => {}}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1">Payment Receipts</h5>
                  <p className="text-xs text-slate-500 font-medium">Delivers a summarized text receipt with total billed & balance due upon invoice payment.</p>
                </div>
              </div>
            </div>

            {/* Test Connection Card */}
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200 space-y-6">
              <div className="flex items-center space-x-3 border-b pb-4">
                <Send className="text-indigo-600" size={20} />
                <div>
                  <h4 className="font-bold text-slate-900">Test SMS Gateway Integration</h4>
                  <p className="text-xs text-slate-500">Send a quick test message using the unsaved token/details above to check the gateway credentials.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                    Recipient Phone
                  </label>
                  <input
                    type="text"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2 flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                      Message
                    </label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleTestSms}
                    loading={isTesting}
                    className="bg-indigo-600 text-white rounded-xl h-[46px] hover:bg-indigo-700 flex items-center justify-center px-6 transition-all shadow-md"
                  >
                    Send Test
                  </Button>
                </div>
              </div>

              {testResult && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {testResult.success ? <CheckCircle2 size={18} className="mt-0.5 text-emerald-600 flex-shrink-0" /> : <XCircle size={18} className="mt-0.5 text-rose-600 flex-shrink-0" />}
                  <div>
                    <span className="font-bold">{testResult.success ? "Integration Verified" : "Authentication Failure"}</span>
                    <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Email Toggle Switch */}
        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl transition-all ${emailEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              <Mail size={22} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Enable Email Notifications</h4>
              <p className="text-xs text-slate-500 font-medium">Activate email dispatches for booking confirmations and reminders.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={emailEnabled} 
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="sr-only peer" 
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {emailEnabled && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
            <div className="flex items-center space-x-3 border-b pb-4">
              <Mail className="text-indigo-600" size={20} />
              <div>
                <h4 className="font-bold text-slate-900">Email Notification Settings</h4>
                <p className="text-xs text-slate-500">Configure triggers and customizable templates for customer email dispatches.</p>
              </div>
            </div>

            {/* Triggers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              <div 
                onClick={() => setEmailOnBooking(!emailOnBooking)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${emailOnBooking ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Triggers</span>
                  <input 
                    type="checkbox" 
                    checked={emailOnBooking}
                    onChange={() => {}}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                </div>
                <h5 className="font-bold text-slate-900 text-sm mb-1">Appointment Booked</h5>
                <p className="text-xs text-slate-500 font-medium">Sends an email confirmation right after booking.</p>
              </div>

              <div 
                onClick={() => setEmailOnReminder(!emailOnReminder)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${emailOnReminder ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Triggers</span>
                  <input 
                    type="checkbox" 
                    checked={emailOnReminder}
                    onChange={() => {}}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                </div>
                <h5 className="font-bold text-slate-900 text-sm mb-1">1-Hour Reminder Alert</h5>
                <p className="text-xs text-slate-500 font-medium">Sends an email reminder 1 hour before the scheduled session.</p>
              </div>
            </div>

            {/* Template Variables Helper */}
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800">Available Placeholders:</span>
              <p className="leading-relaxed font-medium">
                Use these tags to dynamically populate customer and schedule details in subject or message body:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">{`{customer_name}`}</code>
                <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">{`{salon_name}`}</code>
                <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">{`{appointment_date}`}</code>
                <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">{`{appointment_time}`}</code>
                <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">{`{service_name}`}</code>
                <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">{`{google_calendar_link}`}</code>
              </div>
            </div>

            {/* Templates Textareas */}
            {emailOnBooking && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h5 className="text-sm font-extrabold text-indigo-950">Booking Confirmation Template</h5>
                <Input
                  label="Email Subject"
                  value={emailBookingSubject}
                  onChange={(e) => setEmailBookingSubject(e.target.value)}
                  placeholder="e.g. Booking Confirmed - {salon_name}"
                />
                <Textarea
                  label="Email Message Body"
                  value={emailBookingTemplate}
                  onChange={(e) => setEmailBookingTemplate(e.target.value)}
                  placeholder="Dear {customer_name}, your booking at {salon_name} is confirmed..."
                  rows={4}
                />
              </div>
            )}

            {emailOnReminder && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h5 className="text-sm font-extrabold text-indigo-950">1-Hour Reminder Template</h5>
                <Input
                  label="Email Subject"
                  value={emailReminderSubject}
                  onChange={(e) => setEmailReminderSubject(e.target.value)}
                  placeholder="e.g. Appointment Reminder - {salon_name}"
                />
                <Textarea
                  label="Email Message Body"
                  value={emailReminderTemplate}
                  onChange={(e) => setEmailReminderTemplate(e.target.value)}
                  placeholder="Dear {customer_name}, this is a reminder for your upcoming session at {salon_name}..."
                  rows={4}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" loading={isSaving} className="px-8 py-3 rounded-2xl shadow-lg">
            Save Notification Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettings;
