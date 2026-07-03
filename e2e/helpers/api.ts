/**
 * Centralized API endpoint registry.
 * All paths are relative to API_BASE_URL (http://localhost:8000).
 */
export const API = {
  // ── Public (no auth required) ───────────────────────────────────────────────
  AUTH_LOGIN:           '/api/v1/auth/login',
  AUTH_REGISTER:        '/api/v1/auth/register',
  AUTH_REFRESH:         '/api/v1/auth/refresh',
  PUBLIC_PACKAGES:      '/api/v1/public/packages',
  PUBLIC_SALON:         (slug: string) => `/api/v1/public/salons/${slug}`,
  PUBLIC_LOOKUP:        (slug: string) => `/api/v1/public/salons/${slug}/lookup`,
  PUBLIC_AVAILABILITY:  (slug: string) => `/api/v1/public/salons/${slug}/availability`,
  PUBLIC_BOOK:          (slug: string) => `/api/v1/public/salons/${slug}/book`,
  CONTACT_SUBMIT:       '/api/v1/contact/submit',
  TRIAL_REGISTER:       '/api/v1/trial/register',
  TRIAL_VERIFY:         '/api/v1/trial/verify',
  TRIAL_RESEND_OTP:     '/api/v1/trial/resend-otp',
  STORAGE:              (type: string, file: string) => `/api/v1/storage/${type}/${file}`,

  // ── Protected – Auth ────────────────────────────────────────────────────────
  AUTH_ME:              '/api/v1/auth/me',
  AUTH_CHANGE_PASSWORD: '/api/v1/auth/change-password',
  AUTH_LOGOUT:          '/api/v1/auth/logout',
  MY_SALON:             '/api/v1/my-salon',

  // ── Protected – Salon ───────────────────────────────────────────────────────
  SALONS:               '/api/v1/salons',
  SALON:                (id: number) => `/api/v1/salons/${id}`,
  SALON_USERS:          (id: number) => `/api/v1/salons/${id}/users`,

  // ── Protected – Users ───────────────────────────────────────────────────────
  USERS:                '/api/v1/users',
  USER:                 (id: number) => `/api/v1/users/${id}`,

  // ── Protected – Staff ───────────────────────────────────────────────────────
  STAFF:                '/api/v1/staff',
  STAFF_MEMBER:         (id: number) => `/api/v1/staff/${id}`,
  STAFF_PASSWORD:       (id: number) => `/api/v1/staff/${id}/password`,
  STAFF_PERMISSIONS:    (id: number) => `/api/v1/staff/${id}/permissions`,
  STAFF_COMMISSIONS:    (id: number) => `/api/v1/staff/${id}/service-commissions`,

  // ── Protected – Customers ───────────────────────────────────────────────────
  CUSTOMERS:            '/api/v1/customers',
  CUSTOMER:             (id: number) => `/api/v1/customers/${id}`,
  CUSTOMER_APPTS:       (id: number) => `/api/v1/customers/${id}/appointments`,

  // ── Protected – Services ────────────────────────────────────────────────────
  SERVICES:             '/api/v1/services',
  SERVICE:              (id: number) => `/api/v1/services/${id}`,
  SERVICE_CATEGORIES:   '/api/v1/service-categories',
  SERVICE_CATEGORY:     (id: number) => `/api/v1/service-categories/${id}`,

  // ── Protected – Appointments ────────────────────────────────────────────────
  APPOINTMENTS:         '/api/v1/appointments',
  APPOINTMENT:          (id: number) => `/api/v1/appointments/${id}`,

  // ── Protected – Dashboard ───────────────────────────────────────────────────
  DASHBOARD_STATS:      '/api/v1/dashboard/stats',

  // ── Protected – Billing ─────────────────────────────────────────────────────
  BILLING_INVOICES:     '/api/v1/billing/invoices',
  BILLING_INVOICE:      (id: number) => `/api/v1/billing/invoices/${id}`,
  BILLING_APPT_STATUS:  (id: number) => `/api/v1/billing/appointment/${id}/status`,
  BILLING_PAY:          '/api/v1/billing/pay',

  // ── Protected – Payments ────────────────────────────────────────────────────
  PAYMENT_SETTINGS:     '/api/v1/payment-settings',
  PAYMENT_PROOFS:       '/api/v1/payment-proofs',
  PAYMENT_PROOFS_HIST:  '/api/v1/payment-proofs/history',
  PAYMENT_PROOF_APPROVE:(id: number) => `/api/v1/payment-proofs/${id}/approve`,
  PAYMENT_PROOF_REJECT: (id: number) => `/api/v1/payment-proofs/${id}/reject`,
  PAYMENTS_UPLOAD:      '/api/v1/payments/upload',
  PAYMENTS_HISTORY:     '/api/v1/payments/history',

  // ── Protected – Reports ─────────────────────────────────────────────────────
  REPORTS_SALES:        '/api/v1/reports/sales',
  REPORTS_PL:           '/api/v1/reports/profit-loss',
  REPORTS_STAFF:        '/api/v1/reports/staff-performance',
  REPORTS_SERVICES:     '/api/v1/reports/service-analytics',

  // ── Protected – Inventory ───────────────────────────────────────────────────
  INVENTORY:            '/api/v1/inventory',
  INVENTORY_ITEM:       (id: number) => `/api/v1/inventory/${id}`,
  INVENTORY_TRANSACTION:'/api/v1/inventory/transaction',
  INVENTORY_LOGS:       '/api/v1/inventory/logs',

  // ── Protected – Expenses ────────────────────────────────────────────────────
  EXPENSES:             '/api/v1/expenses',
  EXPENSE_CATEGORIES:   '/api/v1/expenses/categories',

  // ── Protected – Settings ────────────────────────────────────────────────────
  SETTINGS:             '/api/v1/settings',
  SETTINGS_UPGRADE:     '/api/v1/settings/upgrade',
  SETTINGS_TEST_SMS:    '/api/v1/settings/test-sms',
  SYSTEM_BANK_DETAILS:  '/api/v1/system-settings/bank-details',

  // ── Protected – Branches ────────────────────────────────────────────────────
  BRANCHES:             '/api/v1/branches',
  BRANCH:               (id: number) => `/api/v1/branches/${id}`,

  // ── Protected – Business Hours ──────────────────────────────────────────────
  BUSINESS_HOURS:       '/api/v1/business-hours',

  // ── Protected – SMS Marketing ───────────────────────────────────────────────
  SMS_CLIENTS_COUNT:    '/api/v1/sms/clients-count',
  SMS_CLIENTS:          '/api/v1/sms/clients',
  SMS_BROADCAST:        '/api/v1/sms/broadcast',
  SMS_BROADCASTS:       '/api/v1/sms/broadcasts',

  // ── Admin-only endpoints ────────────────────────────────────────────────────
  ADMIN_STATS:                  '/api/v1/admin/stats',
  ADMIN_DASHBOARD:              '/api/v1/admin/dashboard',
  ADMIN_CONTACT_MESSAGES:       '/api/v1/admin/contact-messages',
  ADMIN_TRIAL_REQUESTS:         '/api/v1/admin/trial-requests',
  ADMIN_TRIAL_APPROVE:          (id: number) => `/api/v1/admin/trial-requests/${id}/approve`,
  ADMIN_TRIAL_ACTIVATE:         (id: number) => `/api/v1/admin/trial-requests/${id}/activate`,
  ADMIN_TRIAL_REJECT:           (id: number) => `/api/v1/admin/trial-requests/${id}/reject`,
  ADMIN_SUBSCRIPTION_EXTEND:    (salonId: number) => `/api/v1/admin/subscriptions/${salonId}/extend`,
  ADMIN_SUBSCRIPTION_AUDIT:     (salonId: number) => `/api/v1/admin/subscriptions/${salonId}/audit-log`,
  ADMIN_SALON_RESET_PW:         (id: number) => `/api/v1/admin/salons/${id}/reset-password`,
  ADMIN_SALON_ACTIVATE_TRIAL:   (id: number) => `/api/v1/admin/salons/${id}/activate-trial`,
  ADMIN_SALON_TEMP_ACCESS:      (id: number) => `/api/v1/admin/salons/${id}/temp-access`,
  ADMIN_SALON_SET_START:        (id: number) => `/api/v1/admin/salons/${id}/set-start-date`,
  ADMIN_SALON_UPDATE:           (id: number) => `/api/v1/admin/salons/${id}`,
  ADMIN_SALON_PLAN:             (id: number) => `/api/v1/admin/salons/${id}/plan`,
  ADMIN_SALON_USERS:            (id: number) => `/api/v1/salons/${id}/users`,
  ADMIN_IMPORT_TEMPLATE:        '/api/v1/admin/import/template',
  ADMIN_IMPORT_INVENTORY:       (id: number) => `/api/v1/admin/salons/${id}/import/inventory`,
  ADMIN_IMPORT_CATEGORIES:      (id: number) => `/api/v1/admin/salons/${id}/import/categories`,
  ADMIN_IMPORT_SERVICES:        (id: number) => `/api/v1/admin/salons/${id}/import/services`,
  ADMIN_PACKAGES:               '/api/v1/admin/packages',
  ADMIN_PACKAGE:                (id: number) => `/api/v1/admin/packages/${id}`,
  ADMIN_SYSTEM_SETTINGS:        '/api/v1/admin/system-settings',
  ADMIN_SALON_PAYMENTS:         '/api/v1/admin/salon-payments',
  ADMIN_SALON_PAYMENT_APPROVE:  (id: number) => `/api/v1/admin/salon-payments/${id}/approve`,
  ADMIN_SALON_PAYMENT_REJECT:   (id: number) => `/api/v1/admin/salon-payments/${id}/reject`,
  ADMIN_INVOICES:               '/api/v1/admin/invoices',
  ADMIN_INVOICES_GENERATE:      '/api/v1/admin/invoices/generate',
  ADMIN_INVOICES_SEND_ALL:      '/api/v1/admin/invoices/send-all',
  ADMIN_INVOICE_SEND:           (id: number) => `/api/v1/admin/invoices/${id}/send`,
} as const;

/** Builds an Authorization header object for the given token */
export function bearerHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Empty headers — used to simulate unauthenticated Postman-style requests */
export const NO_AUTH_HEADERS = {};
