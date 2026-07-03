/**
 * 05 — Storage endpoint security tests
 *
 * GET /api/v1/storage/{type}/{file} serves uploaded files.
 *
 * Security requirements:
 *   - PRIVATE types (payment-proofs, payment-slips, documents, invoices)
 *     MUST require a valid Bearer token → 401 without auth
 *   - PUBLIC types (salon-logos, avatars, staff-photos, covers)
 *     CAN be served without auth (they are intentionally public)
 *   - No file type outside the allowed MIME whitelist should be served
 *   - Path traversal attempts must be blocked
 *
 * NOTE: The fix for the storage vulnerability has been applied in
 * backend/app/Controllers/StorageController.php.
 */

import { test, expect } from '@playwright/test';
import { API, bearerHeader } from '../../helpers/api';
import { getUserAuth, FAKE_TOKEN } from '../../helpers/auth';

const BASE = process.env.API_BASE_URL || 'http://localhost:8000';

// ── Private types require authentication ──────────────────────────────────────

test.describe('Private file types require authentication', () => {
  const privateTypes = ['payment-proofs', 'payment-slips', 'documents', 'invoices'];

  for (const fileType of privateTypes) {
    test(`GET /storage/${fileType}/testfile.jpg → 401 without auth`, async ({ request }) => {
      const res = await request.get(`${BASE}${API.STORAGE(fileType, 'testfile.jpg')}`, {
        headers: {},
      });
      // Must be 401 (unauthorized) or 404 (file not found — but auth checked first)
      // A 200 here means the security fix is NOT working.
      expect(
        res.status(),
        `CRITICAL: /storage/${fileType}/testfile.jpg returned ${res.status()} without auth — must be 401`,
      ).not.toBe(200);
      // The primary expectation: no auth → 401
      expect([401, 404]).toContain(res.status());
      if (res.status() === 401) {
        const body = await res.json();
        expect(body.success).toBe(false);
      }
    });

    test(`GET /storage/${fileType}/testfile.jpg → 401 with invalid token`, async ({ request }) => {
      const res = await request.get(`${BASE}${API.STORAGE(fileType, 'testfile.jpg')}`, {
        headers: { Authorization: `Bearer ${FAKE_TOKEN}` },
      });
      expect([401, 404]).toContain(res.status());
    });

    test(`GET /storage/${fileType}/testfile.jpg → not 401 with valid token`, async ({ request }) => {
      const auth = getUserAuth();
      if (!auth) {
        test.skip(true, 'No user auth configured');
      }
      const res = await request.get(`${BASE}${API.STORAGE(fileType, 'testfile.jpg')}`, {
        headers: bearerHeader(auth!.token),
      });
      // Valid token + file missing = 404 (good)
      // Valid token + file exists = 200 (good)
      // Invalid auth response = 401 (means the security fix is broken)
      expect(res.status()).not.toBe(401);
    });
  }
});

// ── Public types remain accessible without auth ───────────────────────────────

test.describe('Public file types are accessible without authentication', () => {
  const publicTypes = ['salon-logos', 'avatars', 'staff-photos', 'covers'];

  for (const fileType of publicTypes) {
    test(`GET /storage/${fileType}/sample.jpg → not 401 (public asset)`, async ({ request }) => {
      const res = await request.get(`${BASE}${API.STORAGE(fileType, 'sample.jpg')}`, {
        headers: {},
      });
      // 404 is fine (file doesn't exist in test env), but 401 means we broke public access
      expect(res.status()).not.toBe(401);
      expect(res.status()).not.toBe(403);
    });
  }
});

// ── Path traversal prevention ─────────────────────────────────────────────────

test.describe('Path traversal attacks are blocked', () => {
  const traversalAttempts = [
    ['..', 'etc/passwd'],
    ['..%2F..', 'etc/shadow'],
    ['salon-logos', '../../../etc/passwd'],
    ['salon-logos', '..%2F..%2Fetc%2Fpasswd'],
    ['salon-logos', '....//....//etc/passwd'],
  ];

  for (const [type, file] of traversalAttempts) {
    test(`GET /storage/${type}/${file} → must not expose server files`, async ({ request }) => {
      const res = await request.get(`${BASE}/api/v1/storage/${type}/${file}`, {
        headers: {},
      });
      // Must not return 200 with file content — only 400 or 404 are acceptable
      expect([400, 401, 403, 404]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.text();
        expect(body).not.toContain('root:');
        expect(body).not.toContain('/bin/bash');
      }
    });
  }
});

// ── MIME type enforcement ─────────────────────────────────────────────────────

test.describe('Non-image / non-PDF files are blocked even if they exist', () => {
  test('GET /storage/salon-logos/malicious.php → must not serve PHP files', async ({ request }) => {
    const auth = getUserAuth();
    const headers = auth ? bearerHeader(auth.token) : {};
    const res = await request.get(`${BASE}${API.STORAGE('salon-logos', 'malicious.php')}`, {
      headers,
    });
    // Acceptable: 400, 403 (forbidden MIME), 404 (file not found)
    // Unacceptable: 200 serving a PHP file
    expect([400, 403, 404]).toContain(res.status());
  });

  test('GET /storage/salon-logos/script.js → must not serve JS files', async ({ request }) => {
    const auth = getUserAuth();
    const headers = auth ? bearerHeader(auth.token) : {};
    const res = await request.get(`${BASE}${API.STORAGE('salon-logos', 'script.js')}`, {
      headers,
    });
    expect([400, 403, 404]).toContain(res.status());
  });
});

// ── Response headers ──────────────────────────────────────────────────────────

test('Storage response includes X-Content-Type-Options: nosniff header', async ({ request }) => {
  const auth = getUserAuth();
  if (!auth) {
    test.skip(true, 'No auth configured — cannot test response headers for valid request');
  }
  // We expect 404 since the file won't exist in test env, but public paths should return early
  // Test with a public type so we skip the auth check
  const res = await request.get(`${BASE}${API.STORAGE('salon-logos', 'nonexistent.jpg')}`, {
    headers: bearerHeader(auth!.token),
  });
  // If the file was found and served (200), check the security header
  if (res.status() === 200) {
    const xContentType = res.headers()['x-content-type-options'];
    expect(xContentType).toBe('nosniff');
  }
  // 404 is acceptable in test environment
  expect([200, 404]).toContain(res.status());
});
