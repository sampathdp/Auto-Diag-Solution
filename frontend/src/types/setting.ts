/**
 * Real backend shape (backend/app/Services/SettingService.php). Much simpler than
 * the mock's Setting type — no label/helper_text/options/readonly, and only 4
 * value types (string/number/boolean/json vs the mock's 6 including textarea/
 * media/select). See ARCHITECTURE.md §8.8 for why the richer mock catalog isn't
 * reproduced backend-side.
 */
export interface Setting {
  id: number;
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
  group_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Display metadata for the known seeded settings (backend/database/seeders/
 * SettingsSeeder.php) — the backend has no label/helper_text columns, so this is
 * maintained client-side. A setting not listed here still renders (falls back to
 * its raw key as the label), so this never blocks new settings created via the API.
 */
export const SETTING_LABELS: Record<string, { label: string; helperText?: string }> = {
  vat_rate: { label: "VAT Rate (%)", helperText: "Applied to all orders at checkout." },
  currency: { label: "Currency", helperText: "3-letter currency code, e.g. AED." },
  site_name: { label: "Site Name" },
  support_email: { label: "Support Email" },
  whatsapp_number: { label: "WhatsApp Number", helperText: "Include the country code, e.g. 9715XXXXXXXX." },
  ga_tracking_id: { label: "Google Analytics Tracking ID" },
  stripe_publishable_key: { label: "Stripe Publishable Key", helperText: "Safe to expose client-side." },
};

export const GROUP_LABELS: Record<string, string> = {
  general: "General",
  tax: "Tax & VAT",
  integrations: "Integrations",
  payments: "Payments",
};
