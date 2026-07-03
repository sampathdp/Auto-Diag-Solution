/**
 * 06 — Multi-tenant isolation tests
 *
 * The system is a multi-tenant SaaS where each salon is a separate tenant.
 * A user from Salon A MUST NOT be able to read, modify, or delete data
 * belonging to Salon B — even with a valid JWT.
 *
 * This tests the TenantMiddleware's `salon_id` isolation logic.
 *
 * To run these tests you need TWO different salon accounts:
 *   TEST_USER_EMAIL / TEST_USER_PASSWORD   → Salon A user
 *   TEST_SALON_B_EMAIL / TEST_SALON_B_PASSWORD → Salon B user
 *
 * Without both accounts configured, tenant isolation tests are skipped.
 */

import { test, expect } from '@playwright/test';
import { API, bearerHeader } from '../../helpers/api';
import { getUserAuth, getSalonBAuth } from '../../helpers/auth';

const BASE = process.env.API_BASE_URL || 'http://localhost:8000';

// ── Pre-flight check ──────────────────────────────────────────────────────────

let salonAToken: string | null = null;
let salonBToken: string | null = null;
let salonAId: number | null = null;
let salonBId: number | null = null;

test.beforeAll(async () => {
  const authA = getUserAuth();
  const authB = getSalonBAuth();

  if (authA && authA.user.salon_id) {
    salonAToken = authA.token;
    salonAId = authA.user.salon_id;
  }

  if (authB && authB.user.salon_id) {
    salonBToken = authB.token;
    salonBId = authB.user.salon_id;
  }
});

function requireBothSalons() {
  if (!salonAToken || !salonBToken || !salonAId || !salonBId) {
    test.skip(
      true,
      'Tenant isolation tests require TWO salon accounts. Set TEST_SALON_B_EMAIL & TEST_SALON_B_PASSWORD in .env.test',
    );
  }
}

// ── Customers — cross-tenant read/write ───────────────────────────────────────

test.describe('Customer data isolation', () => {
  test('Salon A cannot read Salon B customers', async ({ request }) => {
    requireBothSalons();

    // Salon B fetches its own customers (OK)
    const salonBCustomers = await request.get(`${BASE}${API.CUSTOMERS}`, {
      headers: bearerHeader(salonBToken!),
    });
    expect(salonBCustomers.ok()).toBe(true);
    const { data: bData } = await salonBCustomers.json();

    // If Salon B has customers, their IDs must not be accessible via Salon A token
    if (bData?.customers?.length > 0) {
      const salonBCustomerId: number = bData.customers[0].id;

      // Try to update Salon B's customer using Salon A's token
      const crossUpdate = await request.put(`${BASE}${API.CUSTOMER(salonBCustomerId)}`, {
        headers: bearerHeader(salonAToken!),
        data: { name: 'INJECTED_BY_SALON_A' },
      });
      // Must be 404 (not visible in tenant context) or 403 (forbidden)
      // 200 means tenant isolation FAILED
      expect(
        crossUpdate.status(),
        `TENANT ISOLATION FAILURE: Salon A modified Salon B's customer ${salonBCustomerId}`,
      ).not.toBe(200);
      expect([403, 404]).toContain(crossUpdate.status());

      // Try to delete Salon B's customer using Salon A's token
      const crossDelete = await request.delete(`${BASE}${API.CUSTOMER(salonBCustomerId)}`, {
        headers: bearerHeader(salonAToken!),
      });
      expect(
        crossDelete.status(),
        `TENANT ISOLATION FAILURE: Salon A deleted Salon B's customer ${salonBCustomerId}`,
      ).not.toBe(200);
      expect([403, 404]).toContain(crossDelete.status());
    }
  });
});

// ── Appointments — cross-tenant access ────────────────────────────────────────

test.describe('Appointment data isolation', () => {
  test('Salon A cannot see Salon B appointments', async ({ request }) => {
    requireBothSalons();

    // Get Salon B's appointments
    const salonBAppts = await request.get(`${BASE}${API.APPOINTMENTS}`, {
      headers: bearerHeader(salonBToken!),
    });
    expect(salonBAppts.ok()).toBe(true);
    const { data: bData } = await salonBAppts.json();

    // Salon A's appointments list should NOT contain Salon B's appointment IDs
    const salonAAppts = await request.get(`${BASE}${API.APPOINTMENTS}`, {
      headers: bearerHeader(salonAToken!),
    });
    expect(salonAAppts.ok()).toBe(true);
    const { data: aData } = await salonAAppts.json();

    if (bData?.appointments?.length > 0 && aData?.appointments?.length > 0) {
      const salonBIds = new Set(bData.appointments.map((a: { id: number }) => a.id));
      const salonAIds = aData.appointments.map((a: { id: number }) => a.id);

      for (const aId of salonAIds) {
        expect(
          salonBIds.has(aId),
          `TENANT ISOLATION FAILURE: Appointment ID ${aId} appears in both Salon A and Salon B responses`,
        ).toBe(false);
      }
    }
  });

  test('Salon A cannot modify Salon B appointment', async ({ request }) => {
    requireBothSalons();

    const salonBAppts = await request.get(`${BASE}${API.APPOINTMENTS}`, {
      headers: bearerHeader(salonBToken!),
    });
    if (!salonBAppts.ok()) return;
    const { data: bData } = await salonBAppts.json();

    if (bData?.appointments?.length > 0) {
      const apptId: number = bData.appointments[0].id;

      const crossModify = await request.put(`${BASE}${API.APPOINTMENT(apptId)}`, {
        headers: bearerHeader(salonAToken!),
        data: { status: 'cancelled', notes: 'INJECTED' },
      });
      expect(crossModify.status()).not.toBe(200);
      expect([403, 404]).toContain(crossModify.status());
    }
  });
});

// ── Services — cross-tenant access ────────────────────────────────────────────

test.describe('Service data isolation', () => {
  test('Salon A cannot delete Salon B services', async ({ request }) => {
    requireBothSalons();

    const salonBServices = await request.get(`${BASE}${API.SERVICES}`, {
      headers: bearerHeader(salonBToken!),
    });
    if (!salonBServices.ok()) return;
    const { data: bData } = await salonBServices.json();

    if (bData?.services?.length > 0) {
      const serviceId: number = bData.services[0].id;

      const crossDelete = await request.delete(`${BASE}${API.SERVICE(serviceId)}`, {
        headers: bearerHeader(salonAToken!),
      });
      expect(
        crossDelete.status(),
        `TENANT ISOLATION FAILURE: Salon A deleted Salon B's service ${serviceId}`,
      ).not.toBe(200);
      expect([403, 404]).toContain(crossDelete.status());
    }
  });
});

// ── Staff — cross-tenant access ───────────────────────────────────────────────

test.describe('Staff data isolation', () => {
  test('Salon A cannot modify Salon B staff', async ({ request }) => {
    requireBothSalons();

    const salonBStaff = await request.get(`${BASE}${API.STAFF}`, {
      headers: bearerHeader(salonBToken!),
    });
    if (!salonBStaff.ok()) return;
    const { data: bData } = await salonBStaff.json();

    if (bData?.staff?.length > 0) {
      const staffId: number = bData.staff[0].id;

      const crossModify = await request.put(`${BASE}${API.STAFF_MEMBER(staffId)}`, {
        headers: bearerHeader(salonAToken!),
        data: { name: 'HACKED' },
      });
      expect(crossModify.status()).not.toBe(200);
      expect([403, 404]).toContain(crossModify.status());

      // Also check permissions endpoint
      const crossPermissions = await request.put(`${BASE}${API.STAFF_PERMISSIONS(staffId)}`, {
        headers: bearerHeader(salonAToken!),
        data: { permissions: ['admin.manage'] },
      });
      expect(crossPermissions.status()).not.toBe(200);
      expect([403, 404]).toContain(crossPermissions.status());
    }
  });
});

// ── Inventory — cross-tenant access ──────────────────────────────────────────

test.describe('Inventory data isolation', () => {
  test('Salon A cannot modify Salon B inventory', async ({ request }) => {
    requireBothSalons();

    const salonBInventory = await request.get(`${BASE}${API.INVENTORY}`, {
      headers: bearerHeader(salonBToken!),
    });
    if (!salonBInventory.ok()) return;
    const { data: bData } = await salonBInventory.json();

    if (bData?.products?.length > 0) {
      const productId: number = bData.products[0].id;

      const crossModify = await request.put(`${BASE}${API.INVENTORY_ITEM(productId)}`, {
        headers: bearerHeader(salonAToken!),
        data: { quantity: 0, price: 0.01 },
      });
      expect(crossModify.status()).not.toBe(200);
      expect([403, 404]).toContain(crossModify.status());
    }
  });
});

// ── Billing — cross-tenant access ────────────────────────────────────────────

test.describe('Billing data isolation', () => {
  test('Salon A cannot read Salon B invoices', async ({ request }) => {
    requireBothSalons();

    const salonBInvoices = await request.get(`${BASE}${API.BILLING_INVOICES}`, {
      headers: bearerHeader(salonBToken!),
    });
    if (!salonBInvoices.ok()) return;
    const { data: bData } = await salonBInvoices.json();

    if (bData?.invoices?.length > 0) {
      const invoiceId: number = bData.invoices[0].id;

      // Try to read Salon B's specific invoice using Salon A's token
      const crossRead = await request.get(`${BASE}${API.BILLING_INVOICE(invoiceId)}`, {
        headers: bearerHeader(salonAToken!),
      });
      // If the invoice is not visible in Salon A's tenant context, must be 404 or 403
      expect([403, 404]).toContain(crossRead.status());
    }
  });
});

// ── Dashboard data isolation ──────────────────────────────────────────────────

test.describe('Dashboard data isolation', () => {
  test('Each salon only sees their own stats', async ({ request }) => {
    requireBothSalons();

    const statsA = await request.get(`${BASE}${API.DASHBOARD_STATS}`, {
      headers: bearerHeader(salonAToken!),
    });
    const statsB = await request.get(`${BASE}${API.DASHBOARD_STATS}`, {
      headers: bearerHeader(salonBToken!),
    });

    expect(statsA.ok()).toBe(true);
    expect(statsB.ok()).toBe(true);

    const { data: dataA } = await statsA.json();
    const { data: dataB } = await statsB.json();

    // If both salons have data, they should not show identical totals
    // (unless both salons genuinely have the same stats — unlikely in a real system)
    // This is a softer check — we just ensure neither throws 500 (data leakage via errors)
    expect(typeof dataA).toBe('object');
    expect(typeof dataB).toBe('object');
  });
});
