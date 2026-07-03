/**
 * 04 — Admin endpoint protection tests
 *
 * Admin-only endpoints require BOTH a valid JWT AND the "admin.manage" permission.
 * A regular authenticated user (salon_owner / staff / receptionist) must receive
 * HTTP 403 Forbidden — not 200 — when hitting admin routes.
 *
 * This prevents privilege escalation: a legitimately logged-in user of one
 * salon must NOT be able to read other salons' data or perform platform-wide ops.
 */

import { test, expect } from '@playwright/test';
import { API, bearerHeader } from '../../helpers/api';
import { getUserAuth } from '../../helpers/auth';

const BASE = process.env.API_BASE_URL || 'http://localhost:8000';

// ── Fixture: regular user auth state ─────────────────────────────────────────

let regularToken: string | null = null;

test.beforeAll(async () => {
  const auth = getUserAuth();
  if (!auth) return;
  // Only use this token if the user is NOT a super_admin (otherwise these tests are meaningless)
  if (auth.user.role !== 'super_admin') {
    regularToken = auth.token;
  }
});

function skipIfNoRegularUser() {
  if (!regularToken) {
    test.skip(true, 'No regular (non-admin) user configured — set TEST_USER_EMAIL/TEST_USER_PASSWORD in .env.test with a non-admin account');
  }
}

// ── Admin GET endpoints — regular user must get 403 ──────────────────────────

test.describe('Admin GET endpoints blocked for regular users', () => {
  const adminGETs: [string, string][] = [
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

  for (const [path, description] of adminGETs) {
    test(`${description} → 403 for regular user`, async ({ request }) => {
      skipIfNoRegularUser();
      const res = await request.get(`${BASE}${path}`, {
        headers: bearerHeader(regularToken!),
      });
      expect(
        res.status(),
        `PRIVILEGE ESCALATION: Regular user got ${res.status()} on ${description} — expected 403`,
      ).toBe(403);
    });
  }
});

// ── Admin POST endpoints — regular user must get 403 ─────────────────────────

test.describe('Admin POST endpoints blocked for regular users', () => {
  const adminPOSTs: [string, string][] = [
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

  for (const [path, description] of adminPOSTs) {
    test(`${description} → 403 for regular user`, async ({ request }) => {
      skipIfNoRegularUser();
      const res = await request.post(`${BASE}${path}`, {
        headers: bearerHeader(regularToken!),
        data: {},
      });
      expect(
        res.status(),
        `PRIVILEGE ESCALATION: Regular user got ${res.status()} on ${description} — expected 403`,
      ).toBe(403);
    });
  }
});

// ── Admin PUT endpoints — regular user must get 403 ──────────────────────────

test.describe('Admin PUT endpoints blocked for regular users', () => {
  const adminPUTs: [string, string][] = [
    [API.ADMIN_SALON_UPDATE(1), 'PUT /admin/salons/:id'],
    [API.ADMIN_SALON_PLAN(1),   'PUT /admin/salons/:id/plan'],
    [API.ADMIN_PACKAGE(1),      'PUT /admin/packages/:id'],
  ];

  for (const [path, description] of adminPUTs) {
    test(`${description} → 403 for regular user`, async ({ request }) => {
      skipIfNoRegularUser();
      const res = await request.put(`${BASE}${path}`, {
        headers: bearerHeader(regularToken!),
        data: {},
      });
      expect(
        res.status(),
        `PRIVILEGE ESCALATION: Regular user got ${res.status()} on ${description} — expected 403`,
      ).toBe(403);
    });
  }
});

// ── Admin DELETE endpoints — regular user must get 403 ───────────────────────

test.describe('Admin DELETE endpoints blocked for regular users', () => {
  test('DELETE /admin/salons/:id/temp-access → 403 for regular user', async ({ request }) => {
    skipIfNoRegularUser();
    const res = await request.delete(`${BASE}${API.ADMIN_SALON_TEMP_ACCESS(1)}`, {
      headers: bearerHeader(regularToken!),
    });
    expect(res.status()).toBe(403);
  });
});

// ── Admin user CAN access admin endpoints ─────────────────────────────────────

test.describe('Admin user can access admin endpoints (positive check)', () => {
  test('GET /admin/stats returns 200 for admin', async ({ request }) => {
    const { getAdminAuth } = await import('../../helpers/auth');
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      test.skip(true, 'No admin user configured — set TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD in .env.test');
    }
    const res = await request.get(`${BASE}${API.ADMIN_STATS}`, {
      headers: bearerHeader(adminAuth!.token),
    });
    // Could be 200 or possibly 403 if the configured admin account doesn't have admin.manage
    expect([200, 204]).toContain(res.status());
  });

  test('GET /admin/packages returns 200 for admin', async ({ request }) => {
    const { getAdminAuth } = await import('../../helpers/auth');
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      test.skip(true, 'No admin user configured');
    }
    const res = await request.get(`${BASE}${API.ADMIN_PACKAGES}`, {
      headers: bearerHeader(adminAuth!.token),
    });
    expect([200, 204]).toContain(res.status());
  });
});

// ── salon/users list (permission-gated even for authenticated users) ──────────

test('GET /salons/:id/users returns 403 for regular user without admin.manage', async ({ request }) => {
  skipIfNoRegularUser();
  const res = await request.get(`${BASE}${API.SALON_USERS(1)}`, {
    headers: bearerHeader(regularToken!),
  });
  // Should be 403 (no permission) or 401 (if salon_id doesn't match tenant context)
  expect([403, 401]).toContain(res.status());
});

// ── Settings upgrade requires admin.manage ────────────────────────────────────

test('POST /settings/upgrade returns 403 for regular user', async ({ request }) => {
  skipIfNoRegularUser();
  const res = await request.post(`${BASE}${API.SETTINGS_UPGRADE}`, {
    headers: bearerHeader(regularToken!),
    data: { plan: 'pro' },
  });
  expect(res.status()).toBe(403);
});
