import { useState, useMemo } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { cn } from "@/lib/utils";
import {
  Send, Users, MessageSquare, History, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, RefreshCw,
  Info, Search, UserCheck, UsersRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

// ── Templates ──────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "birthday",
    label: "Birthday Greeting",
    icon: "🎂",
    subject: "Happy Birthday!",
    message:
      "Happy Birthday {name}! 🎉 As a special gift, enjoy 15% off your next visit at {salon}. Book now to celebrate in style! Reply STOP to opt out.",
  },
  {
    id: "offer",
    label: "Special Offer",
    icon: "🎁",
    subject: "Exclusive Offer",
    message:
      "Hi {name}! ✨ Exclusive offer from {salon}: Book this week and get 20% off all services. Limited slots — don't miss out! Reply STOP to opt out.",
  },
  {
    id: "reengagement",
    label: "We Miss You",
    icon: "💫",
    subject: "We Miss You",
    message:
      "Hi {name}, it's been a while! 😊 We'd love to see you back at {salon}. Book your next appointment today and enjoy a complimentary head massage. Reply STOP to opt out.",
  },
  {
    id: "holiday",
    label: "Holiday Greetings",
    icon: "🌟",
    subject: "Season's Greetings",
    message:
      "Season's Greetings from all of us at {salon}, {name}! 🌟 Wishing you and your family a wonderful holiday. Book now for a festive makeover! Reply STOP to opt out.",
  },
  {
    id: "newservice",
    label: "New Service",
    icon: "✂️",
    subject: "New Service Available",
    message:
      "Hi {name}! Exciting news from {salon} — we've just launched a new service. Be among the first to try it at a special introductory price. Call us or book online! Reply STOP to opt out.",
  },
  {
    id: "custom",
    label: "Custom Message",
    icon: "✏️",
    subject: "",
    message: "",
  },
];

const MAX_CHARS = 640;
const SMS_CREDIT_SIZE = 160;

interface SmsClient {
  id: number;
  name: string;
  phone: string;
}

export const SmsMarketing = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [label, setLabel]     = useState(TEMPLATES[0].subject);
  const [message, setMessage] = useState(TEMPLATES[0].message);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Recipient selection state
  const [recipientMode, setRecipientMode] = useState<"all" | "select">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [clientSearch, setClientSearch] = useState("");

  // Fetch all clients with phones
  const { data: clientsData, isLoading: clientsLoading } = useApiQuery<any>(
    ["sms-clients"],
    "/sms/clients"
  );
  const allClients: SmsClient[] = clientsData?.data?.clients ?? [];

  // Filtered list for search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return allClients;
    const q = clientSearch.toLowerCase();
    return allClients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [allClients, clientSearch]);

  // Active recipient count
  const recipientCount =
    recipientMode === "all" ? allClients.length : selectedIds.size;

  // Fetch broadcast history
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useApiQuery<any>(["sms-broadcasts"], "/sms/broadcasts", {
    enabled: showHistory,
  });
  const broadcasts: any[] = historyData?.data?.broadcasts ?? [];

  // Broadcast mutation
  const { mutate: sendBroadcast, isPending: isSending } = useApiMutation(
    (payload: { label: string; message: string; customer_ids?: number[] }) =>
      apiClient.post("/sms/broadcast", payload),
    undefined,
    [["sms-broadcasts"]]
  );

  const charsUsed    = message.length;
  const smsCredits   = Math.ceil(charsUsed / SMS_CREDIT_SIZE) || 1;
  const totalCredits = smsCredits * recipientCount;
  const isOverLimit  = charsUsed > MAX_CHARS;

  const handleTemplateSelect = (tmpl: typeof TEMPLATES[0]) => {
    setSelectedTemplate(tmpl);
    if (tmpl.id !== "custom") {
      setLabel(tmpl.subject);
      setMessage(tmpl.message);
    }
  };

  const toggleClient = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredClients.map((c) => c.id)));
  const clearAll  = () => setSelectedIds(new Set());

  const handleSend = () => {
    if (!message.trim()) { toast.error("Message cannot be empty."); return; }
    if (isOverLimit)      { toast.error("Message is too long."); return; }
    if (recipientCount === 0) {
      toast.error(
        recipientMode === "all"
          ? "No clients with phone numbers found."
          : "Select at least one client."
      );
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSend = () => {
    setShowConfirm(false);
    const payload: { label: string; message: string; customer_ids?: number[] } = {
      label: label || "Broadcast",
      message,
    };
    if (recipientMode === "select") {
      payload.customer_ids = Array.from(selectedIds);
    }
    sendBroadcast(payload, {
      onSuccess: (res: any) => {
        const d = res.data?.data;
        toast.success(`Done! ${d?.sent ?? 0} sent${d?.failed ? `, ${d.failed} failed` : ""}.`);
        refetchHistory();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message ?? "Broadcast failed. Check SMS settings.");
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xl font-black text-slate-900">SMS Marketing</h3>
        <p className="text-sm text-slate-500 mt-1">
          Send greetings, offers, and custom messages to your clients via text.lk.
        </p>
      </div>

      {/* ── Recipients Section ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toggle bar */}
        <div className="flex items-center gap-0 border-b border-slate-100">
          <button
            onClick={() => setRecipientMode("all")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors",
              recipientMode === "all"
                ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <UsersRound size={16} />
            All Clients
            {!clientsLoading && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-black",
                recipientMode === "all"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-500"
              )}>
                {allClients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setRecipientMode("select")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors",
              recipientMode === "select"
                ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <UserCheck size={16} />
            Select Clients
            {recipientMode === "select" && selectedIds.size > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-black bg-indigo-100 text-indigo-700">
                {selectedIds.size}
              </span>
            )}
          </button>
        </div>

        {recipientMode === "all" && (
          <div className="px-5 py-4 flex items-center gap-3">
            <Users size={16} className="text-indigo-400" />
            {clientsLoading ? (
              <span className="text-sm text-slate-400">Loading clients...</span>
            ) : allClients.length === 0 ? (
              <span className="text-sm text-amber-700">
                No clients with phone numbers found. Add phone numbers to your client records.
              </span>
            ) : (
              <span className="text-sm text-slate-600">
                SMS will be sent to all{" "}
                <strong className="text-slate-900">{allClients.length}</strong> client
                {allClients.length !== 1 ? "s" : ""} who have a phone number.
              </span>
            )}
          </div>
        )}

        {recipientMode === "select" && (
          <div className="p-4 space-y-3">
            {/* Search + bulk actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <button
                onClick={selectAll}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            </div>

            {/* Client list */}
            {clientsLoading ? (
              <div className="py-6 text-center text-sm text-slate-400">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                {clientSearch ? "No clients match your search." : "No clients with phone numbers found."}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                {filteredClients.map((client) => {
                  const checked = selectedIds.has(client.id);
                  return (
                    <label
                      key={client.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                        checked ? "bg-indigo-50" : "hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClient(client.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", checked ? "text-indigo-800" : "text-slate-800")}>
                          {client.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{client.phone}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selected summary */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-sm">
                <UserCheck size={14} className="text-indigo-500 shrink-0" />
                <span className="text-indigo-700 font-semibold">
                  <strong>{selectedIds.size}</strong> client{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Template + Composer ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Picker */}
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Choose Template
          </p>
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleTemplateSelect(tmpl)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                selectedTemplate.id === tmpl.id
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
              )}
            >
              <span className="text-xl leading-none">{tmpl.icon}</span>
              <span className="text-sm font-semibold">{tmpl.label}</span>
            </button>
          ))}
        </div>

        {/* Message Composer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Campaign label */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Campaign Name (for your records)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. June Special Offer"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Message body */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Message
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className={cn(
                "w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 resize-none font-medium leading-relaxed",
                isOverLimit
                  ? "border-red-400 focus:ring-red-300 bg-red-50/30"
                  : "border-slate-200 focus:ring-indigo-400"
              )}
            />
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Info size={11} />
              Use{" "}
              <code className="bg-slate-100 px-1 rounded text-[10px] font-mono">{"{name}"}</code>{" "}
              and{" "}
              <code className="bg-slate-100 px-1 rounded text-[10px] font-mono">{"{salon}"}</code>{" "}
              — replaced per client automatically.
            </p>

            {/* Counters */}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className={cn("font-bold", isOverLimit ? "text-red-600" : "text-slate-700")}>
                {charsUsed}/{MAX_CHARS} chars
              </span>
              <span className="text-slate-300">|</span>
              <span>
                <strong>{smsCredits}</strong> credit{smsCredits > 1 ? "s" : ""}/recipient
              </span>
              {recipientCount > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>
                    <strong>{totalCredits.toLocaleString()}</strong> total credits
                  </span>
                </>
              )}
            </div>
          </div>

          {/* SMS Preview */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MessageSquare size={12} /> Preview
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                {message
                  ? message.replace(/\{name\}/g, "Nimasha").replace(/\{salon\}/g, "Your Salon")
                  : <span className="text-slate-400 italic">Your message will appear here...</span>}
              </p>
            </div>
          </div>

          {/* Send button */}
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={isSending || isOverLimit || recipientCount === 0 || !message.trim()}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all shadow-sm",
                isSending || isOverLimit || recipientCount === 0 || !message.trim()
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg"
              )}
            >
              {isSending ? (
                <><RefreshCw size={16} className="animate-spin" /> Sending...</>
              ) : (
                <><Send size={16} /> Send to {recipientCount.toLocaleString()} Client{recipientCount !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Broadcast History ────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 pt-6">
        <button
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) refetchHistory(); }}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <History size={16} />
          Broadcast History
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showHistory && (
          <div className="mt-4">
            {historyLoading ? (
              <p className="text-sm text-slate-400 py-4 text-center">Loading history...</p>
            ) : broadcasts.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No broadcasts sent yet.</p>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((b: any) => (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">
                      {b.status === "done"    && <CheckCircle2 size={20} className="text-emerald-500" />}
                      {b.status === "partial" && <AlertTriangle size={20} className="text-amber-500" />}
                      {b.status === "failed"  && <XCircle size={20} className="text-red-500" />}
                      {b.status === "sending" && <RefreshCw size={20} className="text-indigo-400 animate-spin" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm">{b.label}</p>
                        <span className="text-xs text-slate-400">
                          {format(new Date(b.created_at), "MMM d, yyyy · HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{b.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold">
                        <span className="text-emerald-700">✓ {b.sent_count} sent</span>
                        {b.failed_count > 0 && (
                          <span className="text-red-500">✗ {b.failed_count} failed</span>
                        )}
                        <span className="text-slate-400">{b.total_recipients} total</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm Modal ────────────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl shrink-0">
                <Send size={22} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg">Confirm Broadcast</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Sending to{" "}
                  <strong className="text-slate-800">{recipientCount.toLocaleString()} client{recipientCount !== 1 ? "s" : ""}</strong>
                  {recipientMode === "select" ? " (selected)" : " (all)"}.{" "}
                  Approximately{" "}
                  <strong className="text-indigo-600">{totalCredits.toLocaleString()} SMS credits</strong> will be used.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Message Preview</p>
              <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
                {message.replace(/\{name\}/g, "Nimasha").replace(/\{salon\}/g, "Your Salon")}
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 text-slate-600 font-semibold hover:text-slate-900 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-sm transition-all"
              >
                <Send size={16} /> Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
