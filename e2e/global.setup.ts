/**
 * Playwright global setup — runs once before all tests.
 *
 * Logs in with admin, regular user, and (optionally) a second-salon user,
 * then writes their tokens to .auth/ so individual test files can load them.
 *
 * Required env vars (set in .env.test):
 *   API_BASE_URL         - e.g. http://localhost:8000
 *   TEST_ADMIN_EMAIL     - super admin / admin.manage user
 *   TEST_ADMIN_PASSWORD
 *   TEST_USER_EMAIL      - regular salon owner / staff user
 *   TEST_USER_PASSWORD
 *   TEST_SALON_B_EMAIL   - (optional) user belonging to a DIFFERENT salon (for isolation tests)
 *   TEST_SALON_B_PASSWORD
 */

import { request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env.test') });

const AUTH_DIR = path.join(__dirname, '.auth');
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

interface LoginResult {
  token: string;
  user: {
    id: number;
    name: string;
    role: string;
    salon_id: number | null;
  };
}

async function loginAs(
  apiCtx: Awaited<ReturnType<typeof request.newContext>>,
  email: string | undefined,
  password: string | undefined,
  label: string,
): Promise<LoginResult | null> {
  if (!email || !password) {
    console.warn(`[global.setup] Skipping ${label}: credentials not set in .env.test`);
    return null;
  }

  const res = await apiCtx.post('/api/v1/auth/login', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    console.error(`[global.setup] Login failed for ${label} (${email}): HTTP ${res.status()}`);
    const body = await res.text();
    console.error(`[global.setup] Response: ${body}`);
    return null;
  }

  const body = await res.json();
  const result: LoginResult = {
    token: body.data.access_token,
    user: body.data.user,
  };

  console.log(`[global.setup] Logged in as ${label}: ${email} (role: ${result.user.role})`);
  return result;
}

async function globalSetup(): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const apiCtx = await request.newContext({ baseURL: BASE_URL });

  const [admin, user, salonB] = await Promise.all([
    loginAs(apiCtx, process.env.TEST_ADMIN_EMAIL,    process.env.TEST_ADMIN_PASSWORD,    'admin'),
    loginAs(apiCtx, process.env.TEST_USER_EMAIL,     process.env.TEST_USER_PASSWORD,     'regular-user'),
    loginAs(apiCtx, process.env.TEST_SALON_B_EMAIL,  process.env.TEST_SALON_B_PASSWORD,  'salon-b-user'),
  ]);

  const write = (filename: string, data: LoginResult) => {
    fs.writeFileSync(path.join(AUTH_DIR, filename), JSON.stringify(data, null, 2));
  };

  if (admin)  write('admin.json',    admin);
  if (user)   write('user.json',     user);
  if (salonB) write('salon_b.json',  salonB);

  await apiCtx.dispose();

  if (!admin && !user) {
    console.warn(
      '\n⚠️  [global.setup] No test credentials configured.\n' +
      '   Tests requiring authentication will be skipped.\n' +
      '   Copy e2e/.env.test.example → e2e/.env.test and fill in real credentials.\n',
    );
  }
}

export default globalSetup;
