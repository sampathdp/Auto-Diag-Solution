# Architecture — eCommerce Skeleton

This project started as a copy of a salon booking/management ERP (`salon-saas`). It has been stripped down
to a clean architectural skeleton: routing, API client, auth (JWT + 2FA + RBAC), database layer, and UI
primitives remain; all salon/appointment/billing/inventory business logic has been removed.

Git history for this cleanup is fully preserved (`git log`) — every deletion and edit is reversible.

---

## 1. Architecture Pattern

Decoupled SPA + REST API, no meta-framework on either side:

```
React SPA (Vite, port 3000) ──axios (JSON, HttpOnly cookies)──> PHP REST API (port 8000)
                                     /api/v1/*                         │
                                                                        ▼
                                                                  MySQL (raw PDO)
```

- Backend: hand-rolled micro-framework — custom `Router`, `Request`/`Response`, manual PSR-4 autoloader,
  Controller → Repository layering over raw PDO (`DatabaseManager`).
- Frontend: Vite + React 18 + TypeScript SPA — React Router v6, Zustand (auth state), TanStack Query
  (server state), Axios (HTTP + refresh-token interceptor), react-hook-form + zod, Tailwind, i18next.
- Deploy: GitHub Actions builds the frontend, bundles it with the PHP backend, FTP-pushes to shared hosting
  (`.github/workflows/main.yml`) — unchanged, still generic.
- **No multi-tenancy** — the salon-specific `TenantContext`/`TenantAwareRepository`/`TenantMiddleware` layer
  was removed entirely (per your call). This is a single-tenant app. Roles are now just `admin` / `customer`
  (previously `super_admin` / `salon_owner` / `staff` / `admin`).

---

## 2. Backend (`backend/`) — final structure

```
backend/
  public/index.php              — HTTP entrypoint: CORS/security headers, global exception handler
  bootstrap/
    app.php                      — builds Router, loads routes/api.php
    manual_autoload.php          — manual PSR-4 autoloader + .env parser + getallheaders() polyfill
  routes/api.php                 — auth (register/login/refresh/me/logout/change-password), 2FA, storage, users
  console.php                    — CLI: migrate / migrate:rollback
  composer.json                  — declares PSR-4 autoload (manual autoloader is what actually runs, see note below)
  app/
    Core/
      Request.php, Response.php  — HTTP request/response wrappers
      Router/Router.php          — regex route matching + middleware pipeline
      Database/
        DatabaseManager.php      — the PDO layer (::query/::beginTransaction/etc.)
        QueryBuilder.php         — fluent where()/paginate()/buildSelect()
        Schema.php, Migration.php — schema-builder DSL + migration base class
      Auth/
        SimpleJWT.php            — custom HS256 JWT (no external dependency)
        JWTService.php           — issues/validates access + refresh tokens
        TOTP.php                 — RFC 6238 2FA
      FileUploader.php           — MIME-validated upload utility
    Controllers/
      BaseController.php         — success()/error() JSON helpers
      AuthController.php         — register/login/refresh/me/logout/change-password, rate-limited, 2FA-aware
      TwoFactorController.php     — 2FA setup/confirm/disable/status
      UserController.php         — generic user CRUD
      StorageController.php      — JWT-gated file serving
    Middleware/
      AuthMiddleware.php          — validates JWT, attaches $request->user
      PermissionMiddleware.php     — checks JWT-embedded permission strings, admin bypasses
      RoleMiddleware.php           — role allowlist check
    Repositories/
      BaseRepository.php          — generic CRUD over a table
      UserRepository.php          — users table repository
    Services/
      BaseService.php, PermissionService.php (wildcard permission matcher),
      PasswordGeneratorService.php, SimpleSmtpMailer.php (raw SMTP client), TwoFactorService.php
    Helpers/functions.php         — env(), dd(), sanitize()
  database/seeders/
    Seeder.php                    — base seeder class
    AdminSeeder.php                — seeds one admin@example.com / admin123 user
  scratch/.gitkeep                — runtime error log lands here (backend/scratch/errors.log), gitignored
  public/uploads/.gitkeep          — file upload target dir, gitignored
```

**Removed entirely**: all salon/appointment/service/staff/billing/inventory/SMS/subscription/promo-code/
branch/trial-registration controllers, services, and repositories; every incremental ERP migration; cron
jobs (`subscription_check.php`, `monthly_invoice.php`); dev/debug scripts (`test_*.php`, `db_debug.php`,
`alter_appointments.php`, `migrate_plan_id.php`); the dead-code duplicate `Database.php`; the multi-tenancy
layer (`TenantContext`, `TenantAwareRepository`, `TenantMiddleware`); the unused `HasPermissions` trait
(its only dependency, `UserPermissionRepository`, had already been removed).

**Auth model now**: JWT payload carries `sub` (user id), `role`, `permissions[]`, `needs_password_change` —
no more `salon_id`/`salon_slug`/`branch_id`. `JWTService::getUserPermissions()` is a placeholder
(`admin` → `['*']`, everyone else → `[]`) — replace with real role/permission-table lookups as the
permission model grows. There is no longer a bundled `users` table migration (the ERP's schema lived in the
now-deleted `DB_Schema` file) — **you'll need to create a fresh `users` table migration** before this runs
against a real database (columns used by the code: `id`, `name`, `email`, `password`, `role`,
`needs_password_change`, plus `two_factor_secret`/`two_factor_enabled`/`two_factor_confirmed_at`, which
`TwoFactorService::ensureSchema()` adds automatically on first use).

**Verified working**: PHP lint on every changed file passes; bootstrap + route registration load with no
autoload errors; a live PHP dev server correctly handled `POST /auth/register` (201), `POST /auth/login`
with bad credentials (401), and `GET /auth/me` unauthenticated (401) against the existing local MySQL
database.

---

## 3. Frontend (`frontend/`) — final structure

```
frontend/src/
  main.tsx, App.tsx                — bootstrap: providers → 1.2s preloader → router
  app/
    providers/AppProvider.tsx      — BrowserRouter + QueryClientProvider + Toaster
    router/AppRouter.tsx           — Protected/Guest/ForceChangePassword route guards, route tree
    router/routes.ts               — privateRoutes[] — currently just /dashboard
    layouts/DashboardLayout.tsx    — sidebar + navbar shell, syncs /auth/me on mount
  api/
    client.ts                     — axios instance, HttpOnly-cookie auth, single-flight 401 refresh+retry
    queryKeys.ts                   — react-query key factory — currently just auth.me
  store/useAuthStore.ts            — Zustand auth store (user, permissions, isAuthenticated), persisted
  services/BaseService.ts, AuthService.ts
  hooks/useAuth.ts, usePermissions.ts, useCan.ts, useApi.ts, useBreadcrumbs.ts
  schemas/LoginSchema.ts
  components/
    ui/*                          — Badge, Button, Checkbox, ConfirmModal, DataTable, EmptyState, Input,
                                     Modal, PageHeader, Preloader, Select, SkeletonLoader, StatCard, Textarea
    SEO.tsx                       — react-helmet-async wrapper
    settings/SecuritySettings.tsx  — 2FA enrollment UI (QR code, recovery codes)
    navbar/Navbar.tsx              — minimal: menu toggle + user avatar/name/role
    sidebar/Sidebar.tsx            — minimal: single Dashboard link + logout
  pages/
    Landing.tsx                    — placeholder public homepage (new, replaces ERP marketing page)
    Dashboard.tsx                   — placeholder authenticated home (new, replaces ERP dashboard)
    Login.tsx                       — 2FA-aware login, generic "Storefront" branding
    ChangePassword.tsx              — forced password-change flow
    PrivacyPolicy.tsx                — legal page shell (content still describes salon data collection —
                                        see follow-ups below)
  i18n.ts, locales/en.json, si.json — i18next setup (locale JSON still has unused salon-flavored strings)
```

**Removed entirely**: all salon/appointment/billing/inventory/SMS/subscription/promo-code/staff/customer
pages, components, hooks, schemas, and services; the 5 booking-widget `themes/`; ERP branding `Assets/`;
`SalonSwitch.tsx`; `PaymentBlockModal`/`BookingModal`/`PrintInvoice`; multi-tenancy header injection
(`X-Target-Salon-Id`) from the API client; `salon_id`/`salon_slug`/`branch_id`/`targetSalonId`/
`activeBranchId`/`activeBranchName`/`plan_name` from the auth store and JWT-derived user object.

**Dependencies pruned** from `package.json`/`vite.config.ts` (no longer imported anywhere):
`@fullcalendar/*`, `recharts`, `react-to-print`, `date-fns`. `qrcode.react` was kept — it's still used by
`SecuritySettings.tsx` for 2FA QR codes.

**Verified working**: `npm install` (lockfile synced, 45 packages removed), `tsc --noEmit` (zero errors),
`npm run build` (production build succeeds, 2074 modules transformed), and a live `vite` dev server serving
the app shell on `GET /` (200).

---

## 4. Tests (`e2e/`)

Playwright security-test harness kept generic (`playwright.config.ts`, `global.setup.ts`, `helpers/`).
Removed `06-tenant-isolation.spec.ts` (multi-tenancy is gone). The remaining specs
(`01-auth-endpoints`, `02-unauthenticated-access`, `03-invalid-tokens`, `04-admin-protection`,
`05-storage-security`) still reference the old ERP-flavored fixtures/roles in places — not re-verified
against the new skeleton in this pass, since running them requires a live DB and the old fixtures.

---

## 5. Follow-ups (not done — flagged, not silently skipped)

These weren't addressed because they're content/data decisions rather than architectural cleanup:

1. **No `users` table migration.** The ERP's schema lived in the deleted `DB_Schema` file. Create a fresh
   migration for `users` (and any tables your eCommerce domain needs) before running against a clean DB.
2. **`PrivacyPolicy.tsx` content** still describes salon-specific data collection (appointment scheduling,
   staff management, `privacy@salonflow.lk`) — only the "SalonFlow" brand name was swapped to a placeholder
   ("Storefront"); the legal text itself needs a real rewrite before publishing.
3. **`locales/en.json` / `si.json`** still contain unused salon-flavored translation strings (marketing copy,
   testimonials) — harmless (nothing references them post-cleanup) but worth trimming when you build real
   i18n content.
4. **e2e specs** reference old role names/fixtures — expect failures until updated for the new `admin`/
   `customer` role model.
5. **`composer.json`** declares real dependencies (`vlucas/phpdotenv`, `firebase/php-jwt`, `monolog`) that
   are not actually used — the app runs on the manual autoloader/custom JWT. Decide whether to wire up real
   Composer autoloading or drop the unused declarations.
6. **Unrelated security pass** (rate limiting, a SQL-injection fix, 2FA) was already sitting uncommitted
   when this cleanup started, documented in `SECURITY.md` — preserved as-is, not part of this cleanup.
