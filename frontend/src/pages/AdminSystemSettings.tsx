import React, { useState, useEffect } from 'react';
import { Settings2, Save, RefreshCw, Building2, CreditCard, Clock } from 'lucide-react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface SystemSettings {
  bank_name: string;
  bank_account_name: string;
  bank_account_no: string;
  bank_branch: string;
  bank_instructions: string;
}

const defaultSettings: SystemSettings = {
  bank_name: '',
  bank_account_name: '',
  bank_account_no: '',
  bank_branch: '',
  bank_instructions: '',
};

export const AdminSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    apiClient.get('/admin/system-settings')
      .then(res => setSettings({ ...defaultSettings, ...(res.data?.data || {}) }))
      .catch(() => toast.error('Failed to load system settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof SystemSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/admin/system-settings', settings);
      toast.success('System settings saved successfully.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={20} className="animate-spin" /> Loading system settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings2 className="text-indigo-600" /> System Settings
        </h1>
        <p className="text-slate-500 mt-1">
          Configure platform-level settings. Changes take effect immediately without a code deploy.
        </p>
      </div>

      {/* Bank Details Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Building2 size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-black text-slate-800">Payment Bank Details</h2>
            <p className="text-xs text-slate-500">
              Displayed to salon owners when they need to make a subscription payment.
            </p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Bank Name
            </label>
            <input
              type="text"
              value={settings.bank_name}
              onChange={e => handleChange('bank_name', e.target.value)}
              placeholder="e.g. Commercial Bank of Ceylon"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Branch
            </label>
            <input
              type="text"
              value={settings.bank_branch}
              onChange={e => handleChange('bank_branch', e.target.value)}
              placeholder="e.g. Colombo Fort Branch"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Account Name
            </label>
            <input
              type="text"
              value={settings.bank_account_name}
              onChange={e => handleChange('bank_account_name', e.target.value)}
              placeholder="e.g. SalonFlow SaaS (PVT) Ltd"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Account Number
            </label>
            <input
              type="text"
              value={settings.bank_account_no}
              onChange={e => handleChange('bank_account_no', e.target.value)}
              placeholder="e.g. 1000283920"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Transfer Instructions (shown below account details)
            </label>
            <textarea
              rows={2}
              value={settings.bank_instructions}
              onChange={e => handleChange('bank_instructions', e.target.value)}
              placeholder="e.g. Please transfer the exact subscription amount and upload the receipt immediately."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="mx-6 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CreditCard size={12} /> Preview (as shown to salon owners)
          </p>
          <div className="text-sm text-slate-700 space-y-0.5 font-medium">
            <p>🏦 <strong>{settings.bank_name || '—'}</strong></p>
            <p>💼 Account Name: <strong>{settings.bank_account_name || '—'}</strong></p>
            <p>💳 Account Number: <strong className="text-indigo-600">{settings.bank_account_no || '—'}</strong></p>
            <p>📍 Branch: <strong>{settings.bank_branch || '—'}</strong></p>
            {settings.bank_instructions && (
              <p className="text-xs text-slate-500 pt-1 border-t border-slate-200 mt-1">{settings.bank_instructions}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cron Job Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
        <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800 text-sm">Subscription Reminder Cron Job</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            To enable automatic expiry reminders (7-day, 3-day, 1-day) and auto-expire subscriptions after the grace period,
            add this line to your server's crontab:
          </p>
          <code className="block mt-2 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900 font-mono break-all">
            0 1 * * * php /path/to/backend/cron/subscription_check.php &gt;&gt; /path/to/backend/scratch/cron.log 2&gt;&amp;1
          </code>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-60"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminSystemSettings;
