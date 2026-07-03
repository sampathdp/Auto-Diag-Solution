/**
 * 02 — Unauthenticated access — the core security test
 *
 * EVERY protected endpoint MUST return HTTP 401 when called without any
 * Authorization header (exactly how someone would hit them from Postman
 * without logging in first).
 *
 * This test file directly addresses the reported vulnerability:
 * "people can do CRUD using Postman without authentication."
 *
 * Any test failure here means a real, unprotected endpoint was found.
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { API } from '../../helpers/api';

const BASE = process.env.API_BASE_URL || 'http://localhost:8000';

// ── Helper ─────────────────────────────────────────────────────────────────────

async function expectUnauthorized(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  request: APIRequestContext,
  description: string,
): Promise<void> {
  const res = await request[method](`${BASE}${path}`, {
    headers: {},   // explicitly NO Authorization header
    data: method !== 'get' ? {} : undefined,
  });
  expect(
    res.status(),
    `SECURITY FAILURE: ${method.toUpperCase()} ${path} (${description}) returned ${res.status()} without auth — expected 401`,
  ).toBe(401);
}

// ── Auth-protected routes ──────────────────────────────────────────────────────

test.describe('GET endpoints — must return 401 without auth', () => {
  const GETs: [string, string][] = [
    [API.AUTH_ME,               'GET /auth/me'],
    [API.MY_SALON,              'GET /my-salon'],
    [API.SALONS,                'GET /salons'],
    [API.SALON(1),              'GET /salons/:id'],
    [API.SALON_USERS(1),        'GET /salons/:id/users'],
    [API.USERS,                 'GET /users'],
    [API.CUSTOMERS,             'GET /customers'],
    [API.CUSTOMER(1),           'GET /customers/:id (if routed)'],
    [API.CUSTOMER_APPTS(1),     'GET /customers/:id/appointments'],
    [API.SERVICES,              'GET /services'],
    [API.SERVICE_CATEGORIES,    'GET /service-categories'],
    [API.APPOINTMENTS,          'GET /appointments'],
    [API.DASHBOARD_STATS,       'GET /dashboard/stats'],
    [API.PAYMENT_SETTINGS,      'GET /payment-settings'],
    [API.PAYMENT_PROOFS,        'GET /payment-proofs'],
    [API.PAYMENT_PROOFS_HIST,   'GET /payment-proofs/history'],
    [API.PAYMENTS_HISTORY,      'GET /payments/history'],
    [API.REPORTS_SALES,         'GET /reports/sales'],
    [API.REPORTS_PL,            'GET /reports/profit-loss'],
    [API.REPORTS_STAFF,         'GET /reports/staff-performance'],
    [API.REPORTS_SERVICES,      'GET /reports/service-analytics'],
    [API.EXPENSES,              'GET /expenses'],
    [API.EXPENSE_CATEGORIES,    'GET /expenses/categories'],
    [API.BUSINESS_HOURS,        'GET /business-hours'],
    [API.STAFF,                 'GET /staff'],
    [API.STAFF_PERMISSIONS(1),  'GET /staff/:id/permissions'],
    [API.STAFF_COMMISSIONS(1),  'GET /staff/:id/service-commissions'],
    [API.BILLING_INVOICES,      'GET /billing/invoices'],
    [API.BILLING_INVOICE(1),    'GET /billing/invoices/:id'],
    [API.BILLING_APPT_STATUS(1),'GET /billing/appointment/:id/status'],
    [API.INVENTORY,             'GET /inventory'],
    [API.INVENTORY_LOGS,        'GET /inventory/logs'],
    [API.SMS_CLIENTS_COUNT,     'GET /sms/clients-count'],
    [API.SMS_CLIENTS,           'GET /sms/clients'],
    [API.SMS_BROADCASTS,        'GET /sms/broadcasts'],
    [API.SETTINGS,              'GET /settings'],
    [API.BRANCHES,              'GET /branches'],
    [API.SYSTEM_BANK_DETAILS,   'GET /system-settings/bank-details'],
    // Admin-only GET endpoints
    [API.ADMIN_STATS,                'GET /admin/stats'],
    [API.ADMIN_DASHBOARD,            'GET /admin/dashboard'],
    [API.ADMIN_CONTACT_MESSAGES,     'GET /admin/contact-messages'],
    [API.ADMIN_TRIAL_REQUESTS,       'GET /admin/trial-requests'],
    [API.ADMIN_IMPORT_TEMPLATE,      'GET /admin/import/template'],
    [API.ADMIN_PACKAGES,             'GET /admin/packages'],
    [API.ADMIN_SYSTEM_SETTINGS,      'GET /admin/system-settings'],
    [API.ADMIN_SUBSCRIPTION_AUDIT(1),'GET /admin/subscriptions/:id/audit-log'],
    [API.ADMIN_INVOICES,             'GET /admin/invoices'],
    [API.ADMIN_SALON_PAYMENTS,       'GET /admin/salon-payments'],
  ];

  for (const [path, description] of GETs) {
    test(description, async ({ request }) => {
      await expectUnauthorized('get', path, request, description);
    });
  }
});

test.describe('POST endpoints — must return 401 without auth', () => {
  const POSTs: [string, string][] = [
    [API.AUTH_CHANGE_PASSWORD,          'POST /auth/change-password'],
    [API.AUTH_LOGOUT,                   'POST /auth/logout'],
    [API.SALONS,                        'POST /salons (create salon)'],
    [API.USERS,                         'POST /users (create user)'],
    [API.CUSTOMERS,                     'POST /customers (create customer)'],
    [API.SERVICES,                      'POST /services (create service)'],
    [API.SERVICE_CATEGORIES,            'POST /service-categories'],
    [API.APPOINTMENTS,                  'POST /appointments (create appointment)'],
    [API.PAYMENT_PROOFS,                'POST /payment-proofs'],
    [API.PAYMENT_PROOF_APPROVE(1),      'POST /payment-proofs/:id/approve'],
    [API.PAYMENT_PROOF_REJECT(1),       'POST /payment-proofs/:id/reject'],
    [API.PAYMENTS_UPLOAD,               'POST /payments/upload'],
    [API.BILLING_INVOICES,              'POST /billing/invoices'],
    [API.BILLING_PAY,                   'POST /billing/pay'],
    [API.EXPENSES,                      'POST /expenses'],
    [API.EXPENSE_CATEGORIES,            'POST /expenses/categories'],
    [API.BUSINESS_HOURS,                'POST /business-hours'],
    [API.STAFF,                         'POST /staff'],
    [API.INVENTORY,                     'POST /inventory'],
    [API.INVENTORY_TRANSACTION,         'POST /inventory/transaction'],
    [API.SMS_BROADCAST,                 'POST /sms/broadcast'],
    [API.SETTINGS,                      'POST /settings'],
    [API.SETTINGS_UPGRADE,              'POST /settings/upgrade'],
    [API.SETTINGS_TEST_SMS,             'POST /settings/test-sms'],
    [API.BRANCHES,                      'POST /branches'],
    // Admin-only POST endpoints
    [API.ADMIN_SALON_RESET_PW(1),       'POST /admin/salons/:id/reset-password'],
    [API.ADMIN_SALON_ACTIVATE_TRIAL(1), 'POST /admin/salons/:id/activate-trial'],
    [API.ADMIN_SALON_TEMP_ACCESS(1),    'POST /admin/salons/:id/temp-access'],
    [API.ADMIN_SALON_SET_START(1),      'POST /admin/salons/:id/set-start-date'],
    [API.ADMIN_TRIAL_APPROVE(1),        'POST /admin/trial-requests/:id/approve'],
    [API.ADMIN_TRIAL_ACTIVATE(1),       'POST /admin/trial-requests/:id/activate'],
    [API.ADMIN_TRIAL_REJECT(1),         'POST /admin/trial-requests/:id/reject'],
    [API.ADMIN_SUBSCRIPTION_EXTEND(1),  'POST /admin/subscriptions/:id/extend'],
    [API.ADMIN_IMPORT_INVENTORY(1),     'POST /admin/salons/:id/import/inventory'],
    [API.ADMIN_IMPORT_CATEGORIES(1),    'POST /admin/salons/:id/import/categories'],
    [API.ADMIN_IMPORT_SERVICES(1),      'POST /admin/salons/:id/import/services'],
    [API.ADMIN_SYSTEM_SETTINGS,         'POST /admin/system-settings'],
    [API.ADMIN_SALON_PAYMENT_APPROVE(1),'POST /admin/salon-payments/:id/approve'],
    [API.ADMIN_SALON_PAYMENT_REJECT(1), 'POST /admin/salon-payments/:id/reject'],
    [API.ADMIN_INVOICES_GENERATE,       'POST /admin/invoices/generate'],
    [API.ADMIN_INVOICES_SEND_ALL,       'POST /admin/invoices/send-all'],
    [API.ADMIN_INVOICE_SEND(1),         'POST /admin/invoices/:id/send'],
  ];

  for (const [path, description] of POSTs) {
    test(description, async ({ request }) => {
      await expectUnauthorized('post', path, request, description);
    });
  }
});

test.describe('PUT endpoints — must return 401 without auth', () => {
  const PUTs: [string, string][] = [
    [API.SALON(1),              'PUT /salons/:id'],
    [API.USER(1),               'PUT /users/:id'],
    [API.CUSTOMER(1),           'PUT /customers/:id'],
    [API.SERVICE(1),            'PUT /services/:id'],
    [API.SERVICE_CATEGORY(1),   'PUT /service-categories/:id'],
    [API.APPOINTMENT(1),        'PUT /appointments/:id'],
    [API.STAFF_MEMBER(1),       'PUT /staff/:id'],
    [API.STAFF_PASSWORD(1),     'PUT /staff/:id/password'],
    [API.STAFF_PERMISSIONS(1),  'PUT /staff/:id/permissions'],
    [API.STAFF_COMMISSIONS(1),  'PUT /staff/:id/service-commissions'],
    [API.INVENTORY_ITEM(1),     'PUT /inventory/:id'],
    [API.BRANCH(1),             'PUT /branches/:id'],
    // Admin-only PUT endpoints
    [API.ADMIN_SALON_UPDATE(1), 'PUT /admin/salons/:id'],
    [API.ADMIN_SALON_PLAN(1),   'PUT /admin/salons/:id/plan'],
    [API.ADMIN_PACKAGE(1),      'PUT /admin/packages/:id'],
  ];

  for (const [path, description] of PUTs) {
    test(description, async ({ request }) => {
      await expectUnauthorized('put', path, request, description);
    });
  }
});

test.describe('DELETE endpoints — must return 401 without auth', () => {
  const DELETEs: [string, string][] = [
    [API.SALON(1),                   'DELETE /salons/:id'],
    [API.USER(1),                    'DELETE /users/:id'],
    [API.CUSTOMER(1),                'DELETE /customers/:id'],
    [API.SERVICE(1),                 'DELETE /services/:id'],
    [API.SERVICE_CATEGORY(1),        'DELETE /service-categories/:id'],
    [API.APPOINTMENT(1),             'DELETE /appointments/:id'],
    [API.STAFF_MEMBER(1),            'DELETE /staff/:id'],
    [API.INVENTORY_ITEM(1),          'DELETE /inventory/:id'],
    [API.BRANCH(1),                  'DELETE /branches/:id'],
    [API.ADMIN_SALON_TEMP_ACCESS(1), 'DELETE /admin/salons/:id/temp-access'],
  ];

  for (const [path, description] of DELETEs) {
    test(description, async ({ request }) => {
      await expectUnauthorized('delete', path, request, description);
    });
  }
});

// ── Confirm public routes are NOT blocked ─────────────────────────────────────

test.describe('Public endpoints remain accessible without auth (sanity check)', () => {
  test('POST /auth/login does not require prior auth', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, {
      data: { email: 'test@example.com', password: 'irrelevant' },
      headers: {},
    });
    // 401 means bad credentials, NOT "no bearer token" — that is correct
    expect(res.status()).not.toBe(403);
    // Should get 401 (bad credentials), not 405 or 500
    expect([400, 401]).toContain(res.status());
  });

  test('GET /public/packages does not require auth', async ({ request }) => {
    const res = await request.get(`${BASE}${API.PUBLIC_PACKAGES}`, { headers: {} });
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });

  test('POST /trial/register does not require auth', async ({ request }) => {
    const res = await request.post(`${BASE}${API.TRIAL_REGISTER}`, {
      data: {},
      headers: {},
    });
    // Should not be blocked by auth — may get 422/400 for missing fields
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });
});
