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
  announcement_en: { label: "Top Bar Message (English)", helperText: "Shown in the bar at the top of the website. Wrap text in **double asterisks** to make it bold." },
  announcement_ar: { label: "Top Bar Message (Arabic)", helperText: "Arabic version of the top bar message. Use **double asterisks** for bold." },
  contact_address_en: { label: "Address (English)", helperText: "Shown in the website footer and Contact page." },
  contact_address_ar: { label: "Address (Arabic)" },
  contact_phone: { label: "Phone Number", helperText: "Shown in the website footer and Contact page." },
  contact_email: { label: "Contact Email", helperText: "Shown in the website footer and Contact page." },
  contact_hours_en: { label: "Opening Hours (English)" },
  contact_hours_ar: { label: "Opening Hours (Arabic)" },
  contact_blurb_en: { label: "Footer Description (English)", helperText: "Short company description shown under the logo in the website footer." },
  contact_blurb_ar: { label: "Footer Description (Arabic)" },
  vat_rate: { label: "VAT Rate (%)", helperText: "Applied to all orders at checkout." },
  currency: { label: "Currency", helperText: "3-letter currency code, e.g. AED." },
  site_name: { label: "Site Name" },
  support_email: { label: "Support Email" },
  whatsapp_number: { label: "WhatsApp Number", helperText: "Include the country code, e.g. 9715XXXXXXXX." },
  ga_tracking_id: { label: "Google Analytics Tracking ID" },
  stripe_publishable_key: { label: "Stripe Publishable Key", helperText: "Safe to expose client-side." },

  // Payment and B2B settings: changing them needs the "Change B2B and payment settings" permission.
  payment_online_card_enabled: { label: "Online card payments", helperText: "On hold. Leave off until a card gateway is connected; checkout shows card as \"Coming soon\"." },
  retail_payment_methods: { label: "Retail payment methods", helperText: 'JSON list. Allowed: "cod", "bank_transfer".' },
  payment_bank_accounts: { label: "Company bank accounts", helperText: "JSON list of {bank_name, account_holder, account_number, iban, swift, branch}. Shown to customers who pay by bank transfer." },
  payment_bank_transfer_instructions: { label: "Bank transfer instructions", helperText: "Shown under the bank details at checkout and in the order email." },
  b2b_registration_enabled: { label: "Dealer registration open", helperText: "When off, the Become a Partner form is closed to new applications." },
  b2b_first_order_requires_quotation: { label: "First dealer order needs a quotation" },
  b2b_default_credit_enabled: { label: "Credit on by default for new dealers" },
  b2b_default_credit_period_days: { label: "Default credit period (days)", helperText: "Counted from the delivery date." },
  b2b_quotation_expiry_days: { label: "Quotation valid for (days)" },
  b2b_invoice_trigger: { label: "Invoice dealers when the order is", helperText: '"delivered" (default) or "shipped".' },
  b2b_payment_methods: { label: "Dealer payment methods", helperText: 'JSON list. Allowed: "cod", "bank_transfer", "cheque", "credit".' },
  b2b_sales_team_emails: { label: "Sales team emails", helperText: 'JSON list of addresses that receive new quotations, e.g. ["sales@example.com"].' },
  b2b_max_document_mb: { label: "Max document upload size (MB)" },
  b2b_terms_html: { label: "Dealer terms and conditions", helperText: "Shown on the Become a Partner page." },
};

export const GROUP_LABELS: Record<string, string> = {
  general: "General",
  contact: "Contact Info",
  tax: "Tax & VAT",
  integrations: "Integrations",
  payments: "Payments",
  b2b: "B2B Dealers",
};
