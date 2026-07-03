# Security Overview

## Authentication
- Custom HS256 JWT (`backend/app/Core/Auth/SimpleJWT.php`) — algorithm hardcoded, immune to `alg:none` bypass.
- Access token: 15 min expiry, carries `sub`, `salon_id`, `branch_id`, `role`, `permissions`.
- Refresh token: random 128-char hex, 7 day expiry, stored in `refresh_tokens` table, revocable.
- Token via `Authorization: Bearer` header or HttpOnly cookie.
- Passwords hashed with `password_hash(..., PASSWORD_BCRYPT)`.
- **Rate limiting**: 5 failed attempts per email locks login for 15 minutes (`login_attempts` table, `AuthController`).
- **Two-factor authentication (TOTP)**: optional per-account, self-service via Settings → Security. RFC 6238 implementation in `backend/app/Core/Auth/TOTP.php`, enrollment/verification in `TwoFactorService` + `TwoFactorController`. 8 single-use recovery codes issued on enable. Enforced at login via `totp_code` field; frontend prompts for it on a `2FA_REQUIRED` response.

## Authorization (middleware chain)
1. **AuthMiddleware** — validates JWT, attaches `$request->user`.
2. **TenantMiddleware** — sets tenant/branch context, blocks access on expired subscription past grace period.
3. **PermissionMiddleware / RoleMiddleware** — checks JWT-embedded permissions/role. `super_admin` bypasses all; `salon_owner`/`admin` get full access to their own salon.
4. **Multi-tenancy** — all queries scoped by `salon_id` via `TenantContext`. Super admin can impersonate a salon via `X-Target-Salon-Id` header (validated against `salons` table).

## Transport / Headers
- CORS: explicit origin allowlist (not `*`), credentials mode.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Global exception handler: logs full trace server-side, returns generic message unless `APP_DEBUG=true`.

## File Storage
- `StorageController` requires valid JWT for private types (`payment-proofs`, `payment-slips`, `documents`, `invoices`).
- Filename/type params sanitized; MIME type allowlist enforced via `finfo` before serving.

## Testing
- E2E Playwright suite (`e2e/`): unauthenticated access on all endpoints, invalid/tampered JWTs, admin protection, storage auth, tenant isolation.

## Fixed (2026-07-03)
| # | Issue | Fix |
|---|-------|-----|
| 1 | No rate limiting on login | 5 failed attempts/email → 15 min lockout (`AuthController`, `login_attempts` table). Verified live: 6th attempt returns 429, resets on success. |
| 2 | `SubscriptionPlanController::update()` built SQL from raw request body keys (SQL injection) | Column names now whitelisted against `SHOW COLUMNS FROM subscription_plans`; unknown/malicious keys are dropped. Verified live against injection payloads. |
| 3 | No 2FA on admin accounts | Full TOTP-based 2FA built: setup/confirm/disable endpoints, recovery codes, login enforcement, frontend enrollment UI (Settings → Security) and login challenge step. Verified live end-to-end. |
| 4 | `backend/.env` tracked in git despite `.gitignore` entry | Untracked via `git rm --cached` (see below) — old commits still hold the file until history is rewritten, which was deliberately out of scope. |

## Remaining / Deferred
| # | Issue | Risk | Note |
|---|-------|------|------|
| 1 | Old git history still contains `backend/.env` with real secrets (SMTP password) | High if repo is ever pushed to a shared/public remote | Requires a history rewrite (e.g. `git filter-repo`) + force-push. Deliberately deferred — destructive and disruptive if the repo has been cloned elsewhere. Rotate the SMTP/DB passwords if this repo has ever left this machine. |
| 2 | Dev-mode `.env` values (`JWT_SECRET`, empty `DB_PASSWORD`, `APP_DEBUG=true`) | High before prod launch | Fine for local dev; must be changed specifically at production deploy time. |
