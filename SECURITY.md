# Security Overview

## Authentication
- Custom HS256 JWT (`backend/app/Core/Auth/SimpleJWT.php`) — algorithm hardcoded, immune to `alg:none` bypass.
- Access token: 15 min expiry, carries `sub`, `salon_id`, `branch_id`, `role`, `permissions`.
- Refresh token: random 128-char hex, 7 day expiry, stored in `refresh_tokens` table, revocable.
- Token via `Authorization: Bearer` header or HttpOnly cookie.
- Passwords hashed with `password_hash(..., PASSWORD_BCRYPT)`.
- **Rate limiting**: 5 failed attempts per email locks login for 15 minutes (`login_attempts` table, `AuthController`).
- **Two-factor authentication (TOTP)**: optional per-account, self-service via Settings → Security. RFC 6238 implementation in `backend/app/Core/Auth/TOTP.php`, enrollment/verification in `TwoFactorService` + `TwoFactorController`. 8 single-use recovery codes issued on enable. Enforced at login via `totp_code` field; frontend prompts for it on a `2FA_REQUIRED` response.

## Authorization (middleware chain), updated 2026-11-22
1. **AuthMiddleware** validates the JWT and attaches `$request->user`.
2. **RoleMiddleware** requires `role = admin` on every `/api/v1/admin/*` route.
3. **PermissionMiddleware** (`[PermissionMiddleware::class, 'permission.key']`) guards sensitive routes. It reads permissions **from the database on every request** (`PermissionService::userHas`), so revoking a permission or deactivating an admin takes effect immediately. Only super admins (`users.is_super_admin = 1`) bypass. A plain admin role is not enough.
4. **Staff management** (`/admin/users*`, `/admin/permissions`) needs `staff.manage`. Changing permissions or super-admin status is super-admin only, a super admin can't remove their own access, and at least one active super admin must remain. A super admin account can only be edited or deleted by another super admin. Changes are written to `admin_activity_logs`.
5. **Payment and B2B settings** (`payment_*`, `retail_payment_methods`, `b2b_*`) need `b2b.settings.manage` to change, even through the generic settings endpoints.

All admins that existed before the `is_super_admin` migration were made super admins, so their access is unchanged. Admins created afterwards start with no special permissions.

(The salon-era TenantMiddleware and multi-tenancy layer were removed; this is a single-tenant store.)

## Transport / Headers
- CORS: explicit origin allowlist (not `*`), credentials mode.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Global exception handler: logs full trace server-side, returns generic message unless `APP_DEBUG=true`.

## File Storage, updated 2026-11-22
- **Public assets** (product media, part images, refund photos) live in `backend/public/uploads/{type}` and are served by `StorageController`. `public/uploads/.htaccess` blocks script execution and directory listing.
- **Sensitive files** (dealer trade licences, Emirates ID images, payment proofs, cheque images) go through `App\Core\PrivateStorage` into `backend/storage/private`. That folder is outside `public/`, has its own deny-all `.htaccess`, and is blocked by the production root `.htaccess` (`storage/` rule in the deploy workflow). They are streamed only by endpoints that have already checked ownership or an admin permission, with `Cache-Control: no-store` and a sandboxing CSP. APIs return record ids, never storage paths.
- `StorageController` used to serve `payment-proofs`, `payment-slips`, `documents` and `invoices` to **any** valid token, which let one customer read another's files. It now returns 404 for those types (401 without a token).
- Uploads are validated by sniffing the MIME type with `finfo` (jpg/png/webp/gif/pdf), files get random names, and the extension comes from the detected type. Private files are size-limited (5 MB default).
- The deploy workflow never uploads `storage/private`, so local test files can't reach production and an FTP sync doesn't delete production documents.

## Email
- All email is queued in `notification_outbox` (`EmailOutbox`) and sent after the response, so a slow or failing SMTP server never blocks or rolls back a request. Failed sends are retried by cron (`notifications:dispatch`) up to 5 times, then marked failed and listed in the admin Email Log with a Resend button.

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
