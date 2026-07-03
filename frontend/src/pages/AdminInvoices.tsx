import { useState } from 'react';
import { useApiQuery } from '@/hooks/useApi';
import apiClient from '@/api/client';
import {
  FileText, Send, RefreshCw, Search, ChevronDown,
  CheckCircle2, Clock, AlertTriangle, Ban, DollarSign, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusStyles: Record<string, string> = {
  sent:      'bg-blue-50 text-blue-700 border-blue-100',
  paid:      'bg-emerald-50 text-emerald-700 border-emerald-100',
  overdue:   'bg-red-50 text-red-700 border-red-100',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'paid')      return <CheckCircle2 size={13} />;
  if (status === 'overdue')   return <AlertTriangle size={13} />;
  if (status === 'cancelled') return <Ban size={13} />;
  return <Clock size={13} />;
};

export const AdminInvoices = () => {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [month, setMonth]         = useState(currentMonth);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [sending, setSending]     = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  const { data, isLoading, refetch } = useApiQuery(
    ['admin-invoices', month, statusFilter, search],
    `/admin/invoices?month=${month}&status=${statusFilter}&search=${encodeURIComponent(search)}`
  );

  const invoices = data?.data?.invoices ?? [];
  const stats    = data?.data?.stats    ?? { total: 0, sent: 0, paid: 0, overdue: 0, revenue: 0 };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/admin/invoices/generate', { month });
      const d = (res as any)?.data;
      toast.success(d?.message ?? 'Invoices generated.');
      refetch();
    } catch {
      toast.error('Failed to generate invoices.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      const res = await apiClient.post('/admin/invoices/send-all', { month });
      const d = (res as any)?.data;
      toast.success(d?.message ?? 'Invoices sent.');
      refetch();
    } catch {
      toast.error('Failed to send invoices.');
    } finally {
      setSendingAll(false);
    }
  };

  const handleDownload = (inv: any) => {
    const periodLabel = `${format(new Date(inv.period_start), 'dd MMM yyyy')} – ${format(new Date(inv.period_end), 'dd MMM yyyy')}`;
    const issueDate   = format(new Date(inv.created_at || inv.period_start), 'dd MMM yyyy');
    const amount      = Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const today       = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const statusMeta: Record<string, { color: string; bg: string; label: string }> = {
      paid:      { color: '#059669', bg: '#ecfdf5', label: 'Paid' },
      overdue:   { color: '#dc2626', bg: '#fef2f2', label: 'Overdue' },
      cancelled: { color: '#6b7280', bg: '#f9fafb', label: 'Cancelled' },
      sent:      { color: '#2563eb', bg: '#eff6ff', label: 'Sent' },
    };
    const sm = statusMeta[inv.status] ?? statusMeta.sent;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      background: #f1f5f9;
      min-height: 100vh;
      padding: 40px 20px;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .page { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
      @page { margin: 15mm 18mm; size: A4; }
    }

    /* ── Toolbar ── */
    .toolbar {
      max-width: 780px; margin: 0 auto 24px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .toolbar-brand { display: flex; align-items: center; gap: 10px; }
    .toolbar-brand .dot {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 14px; font-weight: 900;
    }
    .toolbar-brand span { font-size: 15px; font-weight: 800; color: #0f172a; }
    .toolbar-actions { display: flex; gap: 8px; }
    .btn {
      padding: 9px 20px; border-radius: 9px; border: none;
      font-size: 13px; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; gap: 7px; transition: opacity .15s;
    }
    .btn:hover { opacity: .85; }
    .btn-ghost { background: #fff; color: #64748b; border: 1.5px solid #e2e8f0; }
    .btn-primary { background: #0f172a; color: #fff; }

    /* ── Page (white A4-ish card) ── */
    .page {
      max-width: 780px; margin: 0 auto;
      background: #fff; border-radius: 20px;
      box-shadow: 0 8px 40px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.06);
      overflow: hidden;
    }

    /* ── Hero header ── */
    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      padding: 40px 48px 36px;
      position: relative; overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute; top: -60px; right: -60px;
      width: 240px; height: 240px; border-radius: 50%;
      background: rgba(99,102,241,.12);
    }
    .hero::after {
      content: '';
      position: absolute; bottom: -80px; right: 80px;
      width: 160px; height: 160px; border-radius: 50%;
      background: rgba(139,92,246,.08);
    }
    .hero-inner { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
    .hero-left .company-label {
      font-size: 10px; font-weight: 700; letter-spacing: .18em;
      text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 6px;
    }
    .hero-left .company-name { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -.5px; }
    .hero-left .company-sub { font-size: 12px; color: rgba(255,255,255,.4); margin-top: 3px; font-weight: 500; }
    .hero-right { text-align: right; }
    .hero-right .inv-label {
      font-size: 10px; font-weight: 700; letter-spacing: .18em;
      text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 6px;
    }
    .hero-right .inv-number {
      font-size: 20px; font-weight: 900; color: #fff;
      font-variant-numeric: tabular-nums; letter-spacing: .02em;
    }
    .status-chip {
      display: inline-flex; align-items: center; gap: 5px;
      margin-top: 10px; padding: 5px 13px;
      border-radius: 20px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em;
      background: ${sm.bg}; color: ${sm.color};
      border: 1px solid ${sm.color}30;
    }
    .status-dot {
      width: 6px; height: 6px; border-radius: 50%; background: ${sm.color};
    }

    /* ── Divider stripe ── */
    .stripe { height: 4px; background: linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4); }

    /* ── Body ── */
    .body { padding: 40px 48px; }

    /* Billed-to + meta grid */
    .top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }

    .section-label {
      font-size: 9px; font-weight: 800; letter-spacing: .18em;
      text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;
    }
    .salon-name { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.2; }
    .salon-email { font-size: 13px; color: #64748b; margin-top: 3px; font-weight: 500; }

    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .meta-item { }
    .meta-item .m-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 3px; }
    .meta-item .m-val { font-size: 13px; font-weight: 700; color: #1e293b; }

    /* Line items */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .items-table thead tr { border-bottom: 2px solid #f1f5f9; }
    .items-table thead th {
      font-size: 9px; font-weight: 800; letter-spacing: .15em;
      text-transform: uppercase; color: #94a3b8;
      padding: 0 0 12px; text-align: left;
    }
    .items-table thead th:last-child { text-align: right; }
    .items-table tbody tr { border-bottom: 1px solid #f8fafc; }
    .items-table tbody td { padding: 14px 0; font-size: 13px; color: #334155; }
    .items-table tbody td:last-child { text-align: right; font-weight: 700; color: #0f172a; }
    .items-table tbody td .item-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

    /* Total bar */
    .total-bar {
      background: linear-gradient(135deg,#0f172a,#1e3a5f);
      border-radius: 14px; padding: 20px 28px;
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 20px;
    }
    .total-bar .t-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.6); text-transform: uppercase; letter-spacing: .1em; }
    .total-bar .t-amount { font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -.5px; }
    .total-bar .t-due { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 2px; }

    /* Bank box */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px; }
    .info-box {
      background: #f8fafc; border: 1px solid #f1f5f9;
      border-radius: 12px; padding: 18px 20px;
    }
    .info-box .ib-label {
      font-size: 9px; font-weight: 800; letter-spacing: .16em;
      text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;
    }
    .info-box .ib-line { font-size: 12.5px; color: #334155; line-height: 1.9; font-weight: 500; }
    .ref-box {
      background: linear-gradient(135deg,#eff6ff,#f0f9ff);
      border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px 20px;
    }
    .ref-box .ref-code {
      font-size: 17px; font-weight: 900; color: #1e40af;
      font-variant-numeric: tabular-nums; letter-spacing: .04em; margin-top: 4px;
    }
    .ref-box .ref-note { font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.6; }

    /* Footer */
    .footer {
      margin-top: 36px; padding-top: 20px; border-top: 1px solid #f1f5f9;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer .f-left { font-size: 11px; color: #cbd5e1; }
    .footer .f-right { font-size: 11px; color: #cbd5e1; text-align: right; }
    .footer .f-brand { font-size: 12px; font-weight: 800; color: #94a3b8; }
  </style>
</head>
<body>

  <!-- Toolbar (hidden on print) -->
  <div class="toolbar">
    <div class="toolbar-brand">
      <div class="dot">S</div>
      <span>SalonFlow</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-ghost" onclick="window.close()">✕ Close</button>
      <button class="btn btn-primary" onclick="window.print()">⬇ Save as PDF</button>
    </div>
  </div>

  <!-- Invoice page -->
  <div class="page">

    <!-- Hero header -->
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-left">
          <div class="company-label">From</div>
          <div class="company-name">SalonFlow</div>
          <div class="company-sub">Salon Management Platform</div>
        </div>
        <div class="hero-right">
          <div class="inv-label">Invoice</div>
          <div class="inv-number">${inv.invoice_number}</div>
          <div>
            <span class="status-chip">
              <span class="status-dot"></span>
              ${sm.label}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Gradient stripe -->
    <div class="stripe"></div>

    <!-- Body -->
    <div class="body">

      <!-- Billed-to + meta -->
      <div class="top-grid">
        <div>
          <div class="section-label">Billed to</div>
          <div class="salon-name">${inv.salon_name}</div>
          <div class="salon-email">${inv.salon_email ?? ''}</div>
        </div>
        <div>
          <div class="section-label">Invoice details</div>
          <div class="meta-grid">
            <div class="meta-item">
              <div class="m-label">Issue Date</div>
              <div class="m-val">${issueDate}</div>
            </div>
            <div class="meta-item">
              <div class="m-label">Cycle</div>
              <div class="m-val" style="text-transform:capitalize">${inv.billing_cycle}</div>
            </div>
            <div class="meta-item" style="grid-column:span 2">
              <div class="m-label">Period</div>
              <div class="m-val">${periodLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Line items -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Plan</th>
            <th>Period</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Subscription — ${inv.plan_name ?? 'Plan'}</td>
            <td>${inv.plan_name ?? '—'}</td>
            <td>${periodLabel}</td>
            <td>LKR ${amount}</td>
          </tr>
        </tbody>
      </table>

      <!-- Total bar -->
      <div class="total-bar">
        <div>
          <div class="t-label">Total Amount Due</div>
          <div class="t-due">Period: ${periodLabel}</div>
        </div>
        <div class="t-amount">LKR ${amount}</div>
      </div>

      <!-- Bank + Ref -->
      <div class="two-col">
        <div class="info-box">
          <div class="ib-label">Payment Instructions</div>
          <div class="ib-line" id="bank-details">Loading…</div>
        </div>
        <div class="ref-box">
          <div class="ib-label" style="color:#3b82f6">Payment Reference</div>
          <div class="ref-code">${inv.invoice_number}</div>
          <div class="ref-note">
            Include this reference when making your bank transfer. Upload your payment slip via the dashboard to confirm.
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="f-left">
          <div class="f-brand">SalonFlow</div>
          Salon Management Platform
        </div>
        <div class="f-right">
          Generated ${today}<br>
          Thank you for your business.
        </div>
      </div>

    </div><!-- /body -->
  </div><!-- /page -->

  <script>
    try {
      fetch('/api/v1/system-settings/bank-details', {
        credentials: 'include'
      })
      .then(r => r.json())
      .then(res => {
        const d = res.data || {};
        const lines = [
          d.bank_name         ? '<b>Bank:</b> '    + d.bank_name         : '',
          d.bank_account_name ? '<b>Account:</b> ' + d.bank_account_name : '',
          d.bank_account_no   ? '<b>Number:</b> '  + d.bank_account_no   : '',
          d.bank_branch       ? '<b>Branch:</b> '  + d.bank_branch       : '',
        ].filter(Boolean);
        document.getElementById('bank-details').innerHTML =
          lines.join('<br>') || 'Contact admin for payment details.';
      })
      .catch(() => {
        document.getElementById('bank-details').textContent = 'Contact admin for payment details.';
      });
    } catch(e) {
      document.getElementById('bank-details').textContent = 'Contact admin for payment details.';
    }
  </script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleResend = async (id: number) => {
    setSending(id);
    try {
      await apiClient.post(`/admin/invoices/${id}/send`);
      toast.success('Invoice resent.');
      refetch();
    } catch {
      toast.error('Failed to resend invoice.');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Salon Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate and send monthly subscription invoices to salons.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Month picker */}
          <div className="relative">
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="h-10 pl-4 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-950/10 cursor-pointer"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-all"
          >
            <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating…' : 'Generate'}
          </button>

          <button
            onClick={handleSendAll}
            disabled={sendingAll}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-60 transition-all shadow-sm"
          >
            <Send size={15} className={sendingAll ? 'animate-pulse' : ''} />
            {sendingAll ? 'Sending…' : 'Send All'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',   value: stats.total,   icon: <FileText size={18} />,    color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Sent',    value: stats.sent,    icon: <Clock size={18} />,       color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'Paid',    value: stats.paid,    icon: <CheckCircle2 size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Overdue', value: stats.overdue, icon: <AlertTriangle size={18} />, color: 'text-red-600',  bg: 'bg-red-50'   },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
          <DollarSign size={22} className="text-white" />
        </div>
        <div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Collected Revenue</p>
          <p className="text-white text-2xl font-black mt-0.5">
            LKR {Number(stats.revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-white/50 text-xs font-semibold">{format(new Date(month + '-01'), 'MMMM yyyy')}</p>
          <p className="text-white/40 text-[10px] mt-0.5">Paid invoices only</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by salon, email, or invoice #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/10"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="h-10 pl-4 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-950/10 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <FileText size={36} className="text-slate-200" />
            <p className="font-semibold">No invoices found for this period.</p>
            <button
              onClick={handleGenerate}
              className="mt-1 text-sm font-bold text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              Generate invoices for {format(new Date(month + '-01'), 'MMMM yyyy')}
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Invoice #', 'Salon', 'Plan', 'Period', 'Amount', 'Status', 'Sent At', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-800 text-xs whitespace-nowrap">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-900">{inv.salon_name}</p>
                    <p className="text-[11px] text-slate-400">{inv.salon_email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                    {inv.plan_name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                    {format(new Date(inv.period_start), 'dd MMM')} – {format(new Date(inv.period_end), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                    LKR {Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${statusStyles[inv.status] ?? statusStyles.sent}`}>
                      <StatusIcon status={inv.status} />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                    {inv.sent_at ? format(new Date(inv.sent_at), 'dd MMM, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(inv)}
                        title="Download invoice as PDF"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition-all"
                      >
                        <Download size={12} />
                        Download
                      </button>
                      <button
                        onClick={() => handleResend(inv.id)}
                        disabled={sending === inv.id}
                        title="Resend invoice email"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <Send size={12} className={sending === inv.id ? 'animate-pulse' : ''} />
                        {sending === inv.id ? 'Sending…' : 'Resend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminInvoices;
