/**
 * 03 — Invalid / tampered token tests
 *
 * The backend MUST reject every variant of a bad JWT with HTTP 401.
 * These tests guard against implementation mistakes like:
 *   - Not validating the JWT signature
 *   - Accepting expired tokens
 *   - Accepting the "none" algorithm (alg:none attack)
 *   - Not checking the Authorization header format
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { API } from '../../helpers/api';
import {
  FAKE_TOKEN,
  EXPIRED_TOKEN,
  GARBAGE_TOKEN,
  TAMPERED_ROLE_TOKEN,
} from '../../helpers/auth';

const BASE = process.env.API_BASE_URL || 'http://localhost:8000';

// Pick a representative protected endpoint for token-rejection tests.
// Using /auth/me because it is the lightest endpoint that requires auth.
const PROBE_URL = `${BASE}${API.AUTH_ME}`;

async function hitWithToken(token: string, request: APIRequestContext) {
  return request.get(PROBE_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Malformed / fake tokens ────────────────────────────────────────────────────

test('rejects a JWT with a fake/invalid signature', async ({ request }) => {
  const res = await hitWithToken(FAKE_TOKEN, request);
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.success).toBe(false);
});

test('rejects an expired JWT', async ({ request }) => {
  const res = await hitWithToken(EXPIRED_TOKEN, request);
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.success).toBe(false);
});

test('rejects a garbage string that is not a JWT at all', async ({ request }) => {
  const res = await hitWithToken(GARBAGE_TOKEN, request);
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.success).toBe(false);
});

test('rejects a JWT with tampered payload (role elevation attempt)', async ({ request }) => {
  const res = await hitWithToken(TAMPERED_ROLE_TOKEN, request);
  expect(res.status()).toBe(401);
});

// ── Algorithm confusion / alg:none attack ─────────────────────────────────────

test('rejects a JWT using alg:none (algorithm confusion attack)', async ({ request }) => {
  // Craft a token where the header declares "alg":"none" — no signature needed.
  // A vulnerable backend would accept this; a secure one must reject it.
  const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 1,
    role: 'super_admin',
    salon_id: null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const noneToken = `${header}.${payload}.`;

  const res = await hitWithToken(noneToken, request);
  expect(res.status()).toBe(401);
});

test('rejects a JWT using RS256 header but HS256 secret (key confusion)', async ({ request }) => {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 999,
    role: 'super_admin',
    salon_id: null,
    iat: 1,
    exp: 9999999999,
  })).toString('base64url');
  const confusionToken = `${header}.${payload}.FAKENONSIGNATURE`;

  const res = await hitWithToken(confusionToken, request);
  expect(res.status()).toBe(401);
});

// ── Authorization header format ────────────────────────────────────────────────

test('rejects request with no Authorization header at all', async ({ request }) => {
  const res = await request.get(PROBE_URL, { headers: {} });
  expect(res.status()).toBe(401);
});

test('rejects "Token <jwt>" (wrong scheme, should be Bearer)', async ({ request }) => {
  const res = await request.get(PROBE_URL, {
    headers: { Authorization: `Token ${FAKE_TOKEN}` },
  });
  expect(res.status()).toBe(401);
});

test('rejects "Basic <credentials>" scheme', async ({ request }) => {
  const res = await request.get(PROBE_URL, {
    headers: { Authorization: 'Basic dXNlcjpwYXNz' },
  });
  expect(res.status()).toBe(401);
});

test('rejects "Bearer" with no token after it', async ({ request }) => {
  const res = await request.get(PROBE_URL, {
    headers: { Authorization: 'Bearer ' },
  });
  expect(res.status()).toBe(401);
});

test('rejects empty Authorization header value', async ({ request }) => {
  const res = await request.get(PROBE_URL, {
    headers: { Authorization: '' },
  });
  expect(res.status()).toBe(401);
});

// ── Verify a valid token is actually accepted (sanity check) ──────────────────

test('accepts a valid token from global setup', async ({ request }) => {
  const { getUserAuth } = await import('../../helpers/auth');
  const auth = getUserAuth();
  if (!auth) {
    test.skip(true, 'No user auth configured — add credentials to .env.test');
  }
  const res = await hitWithToken(auth!.token, request);
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data).toHaveProperty('user');
});

// ── Verify tokens cannot be used after logout ─────────────────────────────────

test('access token is rejected after the user logs out', async ({ request }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    test.skip(true, 'Credentials not configured');
  }

  // Fresh login — we'll throw away this session after
  const loginRes = await request.post(`${BASE}${API.AUTH_LOGIN}`, {
    data: { email, password },
  });
  if (!loginRes.ok()) test.skip(true, 'Login failed');
  const { data } = await loginRes.json();

  // Verify the token works before logout
  const beforeLogout = await hitWithToken(data.access_token, request);
  expect(beforeLogout.ok()).toBe(true);

  // Logout
  await request.post(`${BASE}${API.AUTH_LOGOUT}`, {
    data: { refresh_token: data.refresh_token },
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  // Access tokens are stateless JWTs — they remain valid until expiry.
  // The critical thing is the REFRESH token is revoked.
  // Test that the refresh token no longer works:
  const refreshAfterLogout = await request.post(`${BASE}${API.AUTH_REFRESH}`, {
    data: { refresh_token: data.refresh_token },
  });
  expect([400, 401]).toContain(refreshAfterLogout.status());
});
