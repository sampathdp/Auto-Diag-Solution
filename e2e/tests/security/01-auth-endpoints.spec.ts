/**
 * 01 — Authentication endpoint security tests
 *
 * Verifies that the login/register/refresh flow behaves correctly:
 * - Valid credentials issue tokens
 * - Bad credentials are rejected
 * - Tokens are returned in the expected shape
 * - Logout revokes the refresh token
 */

import { test, expect } from '@playwright/test';
import { API } from '../../helpers/api';
import { getUserAuth } from '../../helpers/auth';

const BASE = process.env.API_BASE_URL || 'http://localhost:8000';

// ── Login ──────────────────────────────────────────────────────────────────────

test.describe('POST /auth/login', () => {
  test('returns 401 for wrong password', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, {
      data: { email: process.env.TEST_USER_EMAIL || 'test@example.com', password: 'WRONG_PASSWORD_XYZ' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('returns 401 for non-existent email', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, {
      data: { email: 'nobody-exists@nowhere.invalid', password: 'irrelevant' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('returns 401 with empty body', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, { data: {} });
    expect([400, 401]).toContain(res.status());
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('returns 401 with missing password field', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, {
      data: { email: 'someone@example.com' },
    });
    expect([400, 401]).toContain(res.status());
  });

  test('does NOT expose password hash in login response', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'TEST_USER_EMAIL/TEST_USER_PASSWORD not set');
    }
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, { data: { email, password } });
    if (!res.ok()) {
      test.skip(true, 'Login failed — check credentials in .env.test');
    }
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('"password"');
    expect(bodyStr).not.toContain('$2y$');  // bcrypt hash prefix
  });

  test('returns access_token, refresh_token and user object on success', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'TEST_USER_EMAIL/TEST_USER_PASSWORD not set');
    }
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, { data: { email, password } });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.data).toHaveProperty('access_token');
    expect(body.data).toHaveProperty('refresh_token');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user).toHaveProperty('id');
    expect(body.data.user).toHaveProperty('role');
    // Tokens must look like JWTs (three dot-separated base64 parts)
    expect(body.data.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test('SQL injection attempt in email field is safely handled', async ({ request }) => {
    const maliciousEmail = "' OR '1'='1' --";
    const res = await request.post(`${BASE}${API.AUTH_LOGIN}`, {
      data: { email: maliciousEmail, password: 'password' },
    });
    // Must reject, not crash (500 would indicate the injection had effect)
    expect([400, 401]).toContain(res.status());
  });
});

// ── Refresh Token ──────────────────────────────────────────────────────────────

test.describe('POST /auth/refresh', () => {
  test('returns 401 with missing refresh_token field', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_REFRESH}`, { data: {} });
    expect([400, 401]).toContain(res.status());
  });

  test('returns 401 for a garbage refresh token string', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_REFRESH}`, {
      data: { refresh_token: 'not-a-real-token-abc123xyz' },
    });
    expect([400, 401]).toContain(res.status());
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('returns 401 for an already-used refresh token (rotation check)', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'Credentials not configured');
    }
    // Login to get a refresh token
    const loginRes = await request.post(`${BASE}${API.AUTH_LOGIN}`, { data: { email, password } });
    if (!loginRes.ok()) test.skip(true, 'Login failed');
    const loginBody = await loginRes.json();
    const refreshToken: string = loginBody.data.refresh_token;

    // Use the refresh token once — should succeed and issue a NEW token
    const firstRefresh = await request.post(`${BASE}${API.AUTH_REFRESH}`, {
      data: { refresh_token: refreshToken },
    });
    expect(firstRefresh.ok()).toBe(true);

    // Try to reuse the SAME (now rotated/revoked) refresh token → must fail
    const secondRefresh = await request.post(`${BASE}${API.AUTH_REFRESH}`, {
      data: { refresh_token: refreshToken },
    });
    expect([400, 401]).toContain(secondRefresh.status());
    const body = await secondRefresh.json();
    expect(body.success).toBe(false);
  });

  test('issues a new access token with the correct shape on valid refresh', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'Credentials not configured');
    }
    const loginRes = await request.post(`${BASE}${API.AUTH_LOGIN}`, { data: { email, password } });
    if (!loginRes.ok()) test.skip(true, 'Login failed');
    const { data: loginData } = await loginRes.json();

    const refreshRes = await request.post(`${BASE}${API.AUTH_REFRESH}`, {
      data: { refresh_token: loginData.refresh_token },
    });
    expect(refreshRes.ok()).toBe(true);
    const body = await refreshRes.json();
    expect(body.data).toHaveProperty('access_token');
    expect(body.data).toHaveProperty('refresh_token');
    // New refresh token must differ from the old one (rotation)
    expect(body.data.refresh_token).not.toBe(loginData.refresh_token);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

test.describe('POST /auth/logout', () => {
  test('returns 401 without a Bearer token', async ({ request }) => {
    const res = await request.post(`${BASE}${API.AUTH_LOGOUT}`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test('invalidates refresh token after logout', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'Credentials not configured');
    }
    // Login
    const loginRes = await request.post(`${BASE}${API.AUTH_LOGIN}`, { data: { email, password } });
    if (!loginRes.ok()) test.skip(true, 'Login failed');
    const { data } = await loginRes.json();

    // Logout with the access token
    const logoutRes = await request.post(`${BASE}${API.AUTH_LOGOUT}`, {
      data: { refresh_token: data.refresh_token },
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    expect(logoutRes.ok()).toBe(true);

    // Attempt to use the now-revoked refresh token → must fail
    const refreshAfterLogout = await request.post(`${BASE}${API.AUTH_REFRESH}`, {
      data: { refresh_token: data.refresh_token },
    });
    expect([400, 401]).toContain(refreshAfterLogout.status());
  });
});

// ── Public endpoints remain accessible ────────────────────────────────────────

test.describe('Public endpoints are accessible without auth', () => {
  test('GET /public/packages returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}${API.PUBLIC_PACKAGES}`);
    expect([200, 204]).toContain(res.status());
  });

  test('POST /contact/submit accepts request (may validate fields)', async ({ request }) => {
    const res = await request.post(`${BASE}${API.CONTACT_SUBMIT}`, {
      data: { name: 'Test', email: 'test@test.com', message: 'Hello' },
    });
    // Should not return 401 (endpoint is public)
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });
});
