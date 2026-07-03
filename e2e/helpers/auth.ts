import * as fs from 'fs';
import * as path from 'path';

export interface AuthState {
  token: string;
  user: {
    id: number;
    name: string;
    role: string;
    salon_id: number | null;
  };
}

const AUTH_DIR = path.join(__dirname, '..', '.auth');

function readAuth(filename: string): AuthState | null {
  const filePath = path.join(AUTH_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AuthState;
  } catch {
    return null;
  }
}

/** Returns auth state for the admin test user. Returns null if global setup did not run or credentials missing. */
export function getAdminAuth(): AuthState | null {
  return readAuth('admin.json');
}

/** Returns auth state for the regular (non-admin) test user. */
export function getUserAuth(): AuthState | null {
  return readAuth('user.json');
}

/** Returns auth state for the second salon's user (used for tenant isolation tests). */
export function getSalonBAuth(): AuthState | null {
  return readAuth('salon_b.json');
}

/**
 * A valid-looking but completely fabricated JWT.
 * Signature is wrong → backend MUST reject with 401.
 */
export const FAKE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOjEsInJvbGUiOiJzdXBlcl9hZG1pbiIsInNhbG9uX2lkIjpudWxsLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0' +
  '.INVALIDSIGNATURETHATMUSTBEREJECTED';

/** An expired JWT (exp = 1 second after epoch). */
export const EXPIRED_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOjEsInJvbGUiOiJzYWxvbl9vd25lciIsInNhbG9uX2lkIjoxLCJpYXQiOjEsImV4cCI6MX0' +
  '.EXPIREDSIGNATURE';

/** Completely garbage string — not even a valid JWT format. */
export const GARBAGE_TOKEN = 'not-a-jwt-at-all-!!!@#$%';

/** Token with tampered payload (role elevated from staff to super_admin). */
export const TAMPERED_ROLE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOjk5OSwicm9sZSI6InN1cGVyX2FkbWluIiwic2Fsb25faWQiOm51bGwsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ' +
  '.TAMPERED';
