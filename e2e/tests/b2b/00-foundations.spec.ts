/**
 * B2B Phase 0 — foundations
 *
 * - Staff management and permission endpoints need staff.manage (super admins hold it).
 * - The admin role alone no longer bypasses permission checks.
 * - The generic storage endpoint never serves sensitive file types.
 * - The email outbox log is admin-only.
 *
 * Uses the accounts from .env.test: TEST_ADMIN_* should be a super admin (every admin
 * that existed before the is_super_admin migration is one), TEST_USER_* a customer.
 */

import { test, expect } from '@playwright/test';
import { bearerHeader } from '../../helpers/api';
import { getAdminAuth, getUserAuth } from '../../helpers/auth';

const BASE = process.env.API_BASE_URL || 'http://localhost:8000';

test.describe('Staff & permission endpoints', () => {
  test('GET /admin/permissions → 401 without a token', async ({ request }) => {
    const res = await request.get(`${BASE}/api/v1/admin/permissions`);
    expect(res.status()).toBe(401);
  });

  test('GET /admin/users → 403 for a customer', async ({ request }) => {
    const user = getUserAuth();
    test.skip(!user, 'TEST_USER credentials not configured');
    const res = await request.get(`${BASE}/api/v1/admin/users`, { headers: bearerHeader(user!.token) });
    expect(res.status()).toBe(403);
  });

  test('PUT /admin/users/{id}/permissions → 403 for a customer', async ({ request }) => {
    const user = getUserAuth();
    test.skip(!user, 'TEST_USER credentials not configured');
    const res = await request.put(`${BASE}/api/v1/admin/users/${user!.user.id}/permissions`, {
      headers: bearerHeader(user!.token),
      data: { is_super_admin: true, permissions: [] },
    });
    expect(res.status()).toBe(403);
  });

  test('super admin sees the permission catalogue', async ({ request }) => {
    const admin = getAdminAuth();
    test.skip(!admin, 'TEST_ADMIN credentials not configured');
    const res = await request.get(`${BASE}/api/v1/admin/permissions`, { headers: bearerHeader(admin!.token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const keys = (body.data as { key: string }[]).map((p) => p.key);
    expect(keys).toContain('staff.manage');
    expect(keys).toContain('b2b.credit.manage');
  });

  test('unknown permission strings are rejected', async ({ request }) => {
    const admin = getAdminAuth();
    test.skip(!admin, 'TEST_ADMIN credentials not configured');
    const res = await request.put(`${BASE}/api/v1/admin/users/${admin!.user.id}/permissions`, {
      headers: bearerHeader(admin!.token),
      data: { is_super_admin: true, permissions: ['made.up.permission'] },
    });
    expect(res.status()).toBe(422);
  });

  test('a super admin cannot remove their own super admin access', async ({ request }) => {
    const admin = getAdminAuth();
    test.skip(!admin, 'TEST_ADMIN credentials not configured');
    const res = await request.put(`${BASE}/api/v1/admin/users/${admin!.user.id}/permissions`, {
      headers: bearerHeader(admin!.token),
      data: { is_super_admin: false, permissions: [] },
    });
    expect(res.status()).toBe(400);
  });

  test('/auth/me returns permissions read from the database', async ({ request }) => {
    const admin = getAdminAuth();
    test.skip(!admin, 'TEST_ADMIN credentials not configured');
    const res = await request.get(`${BASE}/api/v1/auth/me`, { headers: bearerHeader(admin!.token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.permissions).toContain('*');
    expect(body.data.user.is_super_admin).toBe(true);
  });
});

test.describe('Sensitive files are never served by /storage', () => {
  for (const type of ['payment-proofs', 'payment-slips', 'documents', 'invoices']) {
    test(`GET /storage/${type}/x.pdf → 404 even with a valid token`, async ({ request }) => {
      const user = getUserAuth() ?? getAdminAuth();
      test.skip(!user, 'No test credentials configured');
      const res = await request.get(`${BASE}/api/v1/storage/${type}/x.pdf`, { headers: bearerHeader(user!.token) });
      expect(res.status()).toBe(404);
    });
  }

  test('storage folder is not reachable over HTTP', async ({ request }) => {
    const res = await request.get(`${BASE}/storage/private/.gitkeep`);
    expect([403, 404]).toContain(res.status());
  });
});

test.describe('Email outbox log', () => {
  test('GET /admin/notifications/outbox → 403 for a customer', async ({ request }) => {
    const user = getUserAuth();
    test.skip(!user, 'TEST_USER credentials not configured');
    const res = await request.get(`${BASE}/api/v1/admin/notifications/outbox`, { headers: bearerHeader(user!.token) });
    expect(res.status()).toBe(403);
  });

  test('admin can read the outbox log', async ({ request }) => {
    const admin = getAdminAuth();
    test.skip(!admin, 'TEST_ADMIN credentials not configured');
    const res = await request.get(`${BASE}/api/v1/admin/notifications/outbox`, { headers: bearerHeader(admin!.token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('summary');
  });
});

test.describe('Payment and B2B settings need b2b.settings.manage', () => {
  test('customer cannot change payment settings', async ({ request }) => {
    const user = getUserAuth();
    test.skip(!user, 'TEST_USER credentials not configured');
    const res = await request.put(`${BASE}/api/v1/admin/settings/bulk`, {
      headers: bearerHeader(user!.token),
      data: { settings: { payment_online_card_enabled: '1' } },
    });
    expect(res.status()).toBe(403);
  });
});
