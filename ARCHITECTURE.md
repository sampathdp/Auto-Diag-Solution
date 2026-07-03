# Architecture Study — Salon ERP → eCommerce Skeleton

> **Note on the project name.** The folder is called `Auto Diag Solution`, but the codebase itself is a
> multi-tenant **salon booking/management SaaS** (`salon-saas`) — salons, appointments, staff, services,
> SMS marketing, subscription billing. There is no "auto diagnostics" domain code anywhere. This appears to
> be a copy of a sibling project (`Salon System`) used as a clean starting point. Everything below describes
> what's actually in the repo.

This document is Step 1 of the cleanup: a full inventory of the codebase with an architecture explanation,
followed by a folder-by-folder KEEP/REMOVE recommendation. **Nothing has been deleted yet.**

A housekeeping note: this folder had no `.git` history on disk (despite session metadata suggesting
otherwise — likely stale from the sibling repo). A fresh repo was initialized and the current state
committed as a baseline (`chore: initial snapshot before eCommerce skeleton cleanup`) so Step 3 is fully
reversible via `git`.

---

## 1. Architecture Pattern

**Classic decoupled SPA + REST API**, no meta-framework on either side:

```
React SPA (Vite, port 3000) ──axios (JSON, HttpOnly cookies)──> PHP REST API (port 8000)
                                     /api/v1/*                         │
                                                                        ▼
                                                                  MySQL (raw PDO)
```

- **No Laravel/Symfony/Slim** — the backend is a **hand-rolled micro-framework**: a custom `Router`,
  `Request`/`Response` wrapper, PSR-4-ish manual autoloader (no Composer autoload actually wired up —
  see §2.1), and a Controller → Service → Repository layering enforced by convention, not a framework.
- **No Next.js/Redux** on the frontend — plain **Vite + React Router v6** SPA, **Zustand** for client auth
  state, **TanStack Query** for server state, **Axios** for HTTP.
- Single deploy artifact: GitHub Actions builds the frontend, bundles it with the PHP backend, and FTP-pushes
  to shared hosting with an `.htaccess` rewrite (`/api/v1/*` → `backend/public/index.php`, everything else →
  SPA `index.html`). See `.github/workflows/main.yml`.
- Multi-tenant: every request is scoped to a `salon_id` ("tenant") via JWT claims + `TenantContext`
  (thread-local-style static state). This tenancy layer is ERP-specific but architecturally interesting —
  flagged below for a judgment call.

---

## 2. Backend (`backend/`)

### 2.1 Bootstrap & entrypoint
- `public/index.php` — single HTTP entrypoint. Sets CORS/security headers, handles OPTIONS preflight,
  builds a `Request`, calls `$router->resolve()`, and wraps everything in a global try/catch that logs
  full traces to `scratch/errors.log` and returns a generic 500 in production.
- `bootstrap/app.php` — creates the `Router`, loads `routes/api.php`.
- `bootstrap/manual_autoload.php` — **hand-written PSR-4 autoloader** (`App\`, `Config\`, `Database\` →
  folders) plus a `.env` parser (`loadDotEnv`) and a `getallheaders()` polyfill. Composer's `composer.json`
  declares PSR-4 autoload + real dependencies (`vlucas/phpdotenv`, `firebase/php-jwt`, `monolog`), but
  **none of them are actually `require`d anywhere** — the app runs entirely on the manual autoloader and a
  custom JWT implementation, not the Composer packages declared. Worth deciding at cleanup: keep the manual
  autoloader (zero-dependency, works without `composer install`) or switch to real Composer autoloading.
- `routes/api.php` — flat list of `$router->get/post/put/delete(path, [Controller::class, 'method'], [middlewares])`
  calls. No route groups/prefixing beyond a `$v1` string constant.

### 2.2 Request lifecycle
`index.php` → `Router::resolve()` (regex-matches path, extracts `{params}`) → runs each route's middleware
stack in order → instantiates the controller and calls the method. Middlewares are plain classes with a
`handle(Request $request): void` method; they call `Response::error(...)` (which `exit`s) to short-circuit.

### 2.3 Layering
`Controller` (HTTP concerns, extends `BaseController` for `success()`/`error()` JSON helpers) →
`Service` (business logic, optional — many controllers call repositories directly) →
`Repository` (extends `BaseRepository` or `TenantAwareRepository`, raw SQL via `DatabaseManager`/`QueryBuilder`).

- `DatabaseManager` (`app/Core/Database/DatabaseManager.php`) — singleton-ish static PDO wrapper, the
  **actual** DB layer used everywhere (`::query()`, `::beginTransaction()`, etc.).
- `Database.php` (`app/Core/Database/Database.php`) — a second, near-identical PDO singleton
  (`Database::getInstance()`). **Grep found zero call sites** — this is dead/duplicate code left over from
  a refactor.
- `QueryBuilder` — small fluent `where()/paginate()/buildSelect()` builder used by `BaseRepository::all()`.
- `Schema` / `Migration` — a tiny schema-builder DSL (`Schema::create($table, fn($t) => $t->id(); ...)`) and
  a `Migration` base class, invoked via `console.php migrate`.

### 2.4 Authentication & authorization
- **JWT**: custom HS256 implementation (`SimpleJWT.php`, algorithm hardcoded — no `alg:none` bypass risk),
  wrapped by `JWTService` (`app/Core/Auth/JWTService.php`) which builds the access-token payload
  (`sub`, `salon_id`, `role`, `permissions`, `branch_id`, `needs_password_change`, 15 min expiry) and
  issues opaque random refresh tokens (128 hex chars, 7 day expiry, stored in `refresh_tokens` table,
  revocable, rotated on every refresh).
- **Delivery**: HttpOnly cookies (`access_token`, `refresh_token`, `Secure`+`SameSite=Strict` in prod) *or*
  `Authorization: Bearer` header — `AuthMiddleware::extractToken()` tries the header first, falls back to
  the cookie.
- **2FA**: TOTP (RFC 6238) — `TOTP.php` (generic, no ERP coupling), `TwoFactorService` (enrollment, QR
  secret, 8 recovery codes), `TwoFactorController` (setup/confirm/disable/status endpoints), enforced
  inline in `AuthController::login()` (`2FA_REQUIRED` response code prompts the frontend for a second step).
  This was added in the current uncommitted work alongside `SecuritySettings.tsx`.
- **Rate limiting**: 5 failed logins/email → 15 min lockout (`login_attempts` table, self-provisioning via
  `ensureLoginAttemptsTable()`).
- **Authorization**: role (`super_admin`/`salon_owner`/`admin`/`staff`) + a **permission string array**
  embedded directly in the JWT at login (`JWTService::getUserPermissions()` — resolves staff overrides →
  salon custom overrides → trial (`*`) → plan permissions → owner fallback (`*`)). `PermissionMiddleware`
  and `RoleMiddleware` check against `$request->user` set by `AuthMiddleware`. `PermissionService` does the
  actual wildcard string matching (`'appointments.*'` matches `'appointments.view'`) — this matcher is
  generic and reusable.
- **Multi-tenancy**: `TenantContext` (static holder for `salonId`/`branchId`/`isSuperAdmin`) is populated by
  `TenantMiddleware`, then `TenantAwareRepository` auto-injects/filters `salon_id` on every query. Clean
  pattern *in the abstract*, but `TenantMiddleware::handle()` also inline-runs ad-hoc `ALTER TABLE`
  "migrations" on every first request and enforces salon subscription/grace-period blocking — both
  thoroughly ERP-specific and should not survive cleanup as-is.
- `SECURITY.md` (new, uncommitted) documents a security pass already done in this session's lineage:
  login rate-limiting added, a SQL-injection hole in `SubscriptionPlanController::update()` fixed
  (column names now whitelisted against `SHOW COLUMNS`), 2FA added, and `backend/.env` confirmed untracked.
  This work is unrelated to the eCommerce-skeleton task but is already committed in the baseline — no action
  needed from us except to note the deferred item: **if this codebase's history was ever pushed anywhere
  with `.env` tracked, rotate those credentials** (not applicable to this fresh repo, but worth telling the
  original repo's owner if `Salon System` is the same lineage).

### 2.5 File storage
`FileUploader::upload()` — validates real MIME type via `finfo` (not client-supplied extension), writes to
`public/uploads/{subdir}/{random}.{ext}`. `StorageController::serve()` proxies reads through the API (so
nginx doesn't need static `/uploads/` config), enforcing JWT auth for a `PRIVATE_TYPES` allowlist
(`payment-proofs`, `documents`, etc.) and re-validating MIME type before serving. Both are generic and
reusable as-is.

### 2.6 Email/SMS
`SimpleSmtpMailer` — zero-dependency raw SMTP client (generic, reusable). `EmailService` wraps it with
per-salon SMTP settings lookup (ERP-specific). `SmsService`/`SmsMarketingController` — ERP bulk SMS feature.

---

## 3. Frontend (`frontend/`)

### 3.1 Stack
Vite 5 + React 18 + TypeScript, React Router v6, **Zustand** (persisted auth store), **TanStack Query**
(server cache), **Axios** (HTTP + interceptors), **react-hook-form + zod** (forms/validation),
**Tailwind + tailwind-merge/cva** (styling), **i18next** (en/si locales), **react-hot-toast**, **Radix UI**
primitives, **Framer Motion**. `@fullcalendar/*` and `recharts` are ERP-feature-specific (calendar
scheduling, reports charts).

### 3.2 Structure
```
src/
  App.tsx / main.tsx        — bootstrap: providers → router
  app/
    providers/AppProvider   — BrowserRouter + QueryClientProvider + Toaster (generic)
    router/AppRouter.tsx    — route tree + ProtectedRoute/GuestRoute/ForceChangePasswordRoute guards (generic pattern)
    router/routes.ts        — privateRoutes[] registry, all ERP pages (ERP-specific content, generic shape)
    layouts/DashboardLayout — sidebar+navbar shell, ERP subscription-block wiring mixed in
  api/
    client.ts               — axios instance: cookie-based auth, single-flight refresh-on-401, tenant header injection
    queryKeys.ts             — react-query key factory (ERP entities, generic pattern)
  store/useAuthStore.ts      — Zustand store, persisted to localStorage (generic shape, ERP-specific fields)
  services/                  — one class per REST resource extending BaseService (generic base + ERP resources)
  hooks/                     — one data hook per ERP resource + generic RBAC/UI hooks
  schemas/                   — zod schemas per ERP form + LoginSchema
  components/
    ui/                      — design-system primitives (generic, reusable almost 1:1)
    settings/, booking/, billing/, navbar/, sidebar/  — ERP feature components
  pages/                     — one file per route, almost entirely ERP screens
  themes/                    — 5 booking-widget visual themes for the *public booking page* (ERP-specific, not a general theming system)
  locales/, i18n.ts          — i18next setup (generic) + ERP-specific translated strings
```

### 3.3 Auth flow (frontend)
`Login.tsx` → `POST /auth/login` → on `2FA_REQUIRED` shows a TOTP step → on success, `useAuthStore.setAuth(user, permissions)`
persists to `localStorage` (`salon-auth-storage`) → cookies (`access_token`/`refresh_token`) are set
HttpOnly by the server, invisible to JS. `apiClient` request interceptor attaches `X-Target-Salon-Id` (super
admin impersonation, ERP-specific) and strips `Content-Type` for `FormData`. Response interceptor: on a
single 401, all concurrent requests share one `/auth/refresh` call (deduped via a module-level promise),
then retries; on refresh failure, force-logout + redirect to `/login`. `usePermissions().can()` mirrors the
backend's wildcard permission matching for route/UI gating.

### 3.4 Build tooling
`vite.config.ts` — `@` alias to `src/`, dev proxy `/api` → `http://localhost:8000` (PHP built-in server),
`optimizeDeps` pre-bundles a handful of heavy ERP-only libs (FullCalendar, recharts) that won't be needed
post-cleanup. `package.json` scripts run frontend+backend concurrently via `concurrently` — convenient
single-command local dev, worth keeping.

---

## 4. Testing & CI

- `e2e/` (Playwright, top-level, sibling to `frontend`/`backend`) — security-focused API tests: unauthenticated
  access, tampered JWTs, admin-route protection, storage auth, tenant isolation. Generic framework
  (`playwright.config.ts`, `global.setup.ts`, `helpers/api.ts`, `helpers/auth.ts`), ERP-flavored fixtures/specs.
- `.github/workflows/main.yml` — on push to `main`/`master`: `npm install && npm run build` in `frontend/`,
  bundles `frontend/dist` + `backend/` (minus `.env`/`scratch/`) into `dist/`, writes a production
  `.htaccess`, FTP-syncs to shared hosting. Generic deploy pipeline, no ERP coupling — keep as-is.

---

## 5. Full Folder Tree — KEEP / REMOVE

Legend: **KEEP** = architectural skeleton, stays as-is. **KEEP\*** = keep the file/pattern but its ERP-specific
contents need stripping (not a straight delete). **REMOVE** = ERP business logic, deleted in Step 3.

### 5.1 Root

| Path | What it is | Verdict |
|---|---|---|
| `backend/`, `frontend/`, `e2e/` | main app trees | see below |
| `.github/workflows/main.yml` | FTP deploy pipeline | **KEEP** |
| `.gitignore` | ignores `.env`, `node_modules`, etc. | **KEEP** |
| `SECURITY.md` | security-pass writeup (uncommitted, unrelated to this task) | **KEEP** (informational) |
| `DB_Schema` | full raw-SQL ERP schema dump (salons, appointments, staff…) | **REMOVE** (ecommerce needs its own schema) |
| `public/uploads/payments/slip_22_*.png` | a **stray top-level `public/` dir** — looks like an accidental duplicate of `backend/public/uploads`, not referenced by any code path found | **REMOVE** |
| `scratch/` (root, currently empty) | leftover empty dir | **REMOVE** (no content; `backend/scratch` is the one actually used at runtime) |
| `.claude/` | this assistant's local tooling config | not part of the app; leave untouched |

### 5.2 Backend (`backend/`)

**Framework core — KEEP**
| Path | Note |
|---|---|
| `public/index.php` | entrypoint, CORS/security headers, global error handler |
| `bootstrap/app.php`, `bootstrap/manual_autoload.php` | router bootstrap, autoloader, dotenv parser |
| `routes/api.php` | **KEEP\*** — keep the file & pattern, delete all ERP route registrations, keep auth/2FA/storage routes |
| `console.php` | **KEEP\*** — keep `migrate`/`migrate:rollback`, remove the `send-reminders` command (ERP) |
| `composer.json` | **KEEP\*** — update name/description; decide whether to wire up real Composer autoloading or keep the manual one |
| `app/Core/Request.php`, `Response.php` | HTTP request/response wrappers | KEEP |
| `app/Core/Router/Router.php` | KEEP |
| `app/Core/Database/DatabaseManager.php` | KEEP — the real PDO layer |
| `app/Core/Database/Database.php` | **REMOVE** — dead duplicate, zero call sites found |
| `app/Core/Database/QueryBuilder.php`, `Schema.php`, `Migration.php` | KEEP — query/schema/migration DSL |
| `app/Core/FileUploader.php` | KEEP — generic upload utility |
| `app/Core/Auth/SimpleJWT.php`, `JWTService.php` | **KEEP\*** — keep the JWT machinery, strip the salon/subscription-specific permission-resolution SQL in `getUserPermissions()` down to a simple role→permissions lookup |
| `app/Core/Auth/TOTP.php` | KEEP — generic RFC 6238 |
| `app/Core/Auth/TenantContext.php` | **KEEP\*** — judgment call, see §6 |
| `app/Controllers/BaseController.php` | KEEP |
| `app/Controllers/AuthController.php` | **KEEP\*** — keep login/register/refresh/me/logout/changePassword, strip the trial-auto-activation block |
| `app/Controllers/TwoFactorController.php` | KEEP — generic |
| `app/Controllers/StorageController.php` | KEEP — generic |
| `app/Controllers/UserController.php` | **KEEP\*** — generic user CRUD shape, strip staff-permission-specific fields |
| `app/Middleware/AuthMiddleware.php` | KEEP |
| `app/Middleware/PermissionMiddleware.php`, `RoleMiddleware.php` | KEEP |
| `app/Middleware/TenantMiddleware.php` | **KEEP\*** — strip the inline `ALTER TABLE`/migration block and subscription grace-period blocking entirely; keep only tenant-context assignment (or remove file if tenancy is dropped, see §6) |
| `app/Repositories/BaseRepository.php` | KEEP |
| `app/Repositories/TenantAwareRepository.php` | **KEEP\*** — see §6 |
| `app/Repositories/UserRepository.php` | KEEP — needed for login |
| `app/Services/BaseService.php` | KEEP |
| `app/Services/PermissionService.php` | KEEP — generic wildcard permission matcher |
| `app/Services/PasswordGeneratorService.php` | KEEP — generic utility |
| `app/Services/TwoFactorService.php` | KEEP |
| `app/Services/SimpleSmtpMailer.php` | KEEP — generic SMTP client |
| `app/Helpers/functions.php` | KEEP — `env()`, `dd()`, `sanitize()` globals |
| `app/Traits/HasPermissions.php` | KEEP (generic trait) — verify contents at cleanup time |
| `database/seeders/Seeder.php` | KEEP — base class |
| `database/seeders/AdminSeeder.php` | **KEEP\*** — useful pattern (seed one initial admin user), strip salon-specific columns |

**ERP business logic — REMOVE**
| Path |
|---|
| `app/Controllers/{Salon,Service,ServiceCategory,Appointment,Dashboard,Payment,PaymentProof,PaymentSettings,BusinessHours,Staff,Billing,Inventory,SmsMarketing,Settings,Branch,TrialRegistration,AdminImport,SubscriptionPlan,SubscriptionAudit,SystemSettings,PromoCode,PublicSalon,Contact,AdminStats,Expense,Reports,Customer,Invoice}Controller.php` |
| `app/Services/{Appointment,Customer,Inventory,Payment,PromoCode,Salon,Service,Settings,Sms,Staff,TrialRegistration,User,Email}Service.php` |
| `app/Repositories/{Appointment,BusinessHours,ContactMessage,Customer,InventoryTransaction,PaymentProof,Payment,Product,PromoCode,Salon,ServiceCategory,Service,Settings,Staff,TrialRegistration,UserPermission}Repository.php` |
| `database/migrations/*.php`, `*.sql` (all 12 files + `lanka_qr_payment.sql`) | all incremental ERP schema changes |
| `cron/subscription_check.php`, `cron/monthly_invoice.php` | ERP billing cron jobs |
| `backend/test_db.php`, `test_api.php`, `alter_appointments.php`, `migrate_plan_id.php` | root-level dev/debug one-off scripts, don't belong in the repo at all |
| `backend/scratch/*.php` (test_*, check_db, db_debug, convert_to_innodb, create_refresh_tokens) | ad-hoc debug scripts — **remove the scripts, keep the `scratch/` directory itself** (the global error handler in `index.php` writes `scratch/errors.log` there) |
| `backend/public/uploads/**` (salon logos, payment proofs/slips) | sample/tenant data blobs — remove contents, keep the directory (writable, used by `FileUploader`) |
| `backend/.env` | not tracked by git (confirmed) — leave untouched, it's your local config |

### 5.3 Frontend (`frontend/`)

**Build tooling & shell — KEEP**
| Path |
|---|
| `index.html`, `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js` — **KEEP\*** on `package.json`/`vite.config.ts` to drop ERP-only deps (`@fullcalendar/*`, `recharts`, `qrcode.react`, `react-to-print`) once the pages using them are gone |
| `src/main.tsx`, `src/App.tsx` | KEEP |
| `src/app/providers/AppProvider.tsx` | KEEP |
| `src/app/router/AppRouter.tsx` | **KEEP\*** — keep guard components, will reference an emptied `routes.ts` |
| `src/app/router/routes.ts` | **KEEP\*** — keep the `RouteMetadata` shape, empty out the ERP route list |
| `src/app/layouts/DashboardLayout.tsx` | **KEEP\*** — strip `PaymentBlockModal`/subscription-event wiring |
| `src/api/client.ts` | **KEEP\*** — keep the refresh-token retry pattern, drop `X-Target-Salon-Id` injection |
| `src/api/queryKeys.ts` | **KEEP\*** — keep the factory pattern, empty the ERP keys |
| `src/store/useAuthStore.ts` | **KEEP\*** — keep the store shape, drop `salon_id`/`salon_slug`/`branch_id`/`targetSalonId`/`plan_name` |
| `src/services/BaseService.ts`, `AuthService.ts` | KEEP |
| `src/hooks/useAuth.ts`, `usePermissions.ts`, `useCan.ts`, `useApi.ts`, `useBreadcrumbs.ts` | KEEP — all generic |
| `src/lib/utils.ts` | KEEP — `cn()` helper |
| `src/types/api.ts` | KEEP — generic envelope types |
| `src/schemas/LoginSchema.ts` | KEEP |
| `src/components/ui/*` (Badge, Button, Checkbox, ConfirmModal, DataTable, EmptyState, Input, Modal, PageHeader, Preloader, Select, SkeletonLoader, StatCard, Textarea) | KEEP — design system primitives |
| `src/components/SEO.tsx` | KEEP |
| `src/components/settings/SecuritySettings.tsx` | KEEP — generic 2FA enrollment UI |
| `src/components/navbar/Navbar.tsx`, `sidebar/Sidebar.tsx` | **KEEP\*** — keep shell, empty the ERP `menuItems` list |
| `src/pages/Login.tsx` | **KEEP\*** — keep 2FA-aware login flow, replace salon marketing copy/testimonial |
| `src/pages/ChangePassword.tsx` | KEEP — generic |
| `src/pages/PrivacyPolicy.tsx` | KEEP — generic legal-page shell (content will need a rewrite eventually, not urgent) |
| `src/i18n.ts`, `src/locales/en.json`, `si.json` | **KEEP\*** — keep i18next setup, ERP strings need trimming later |
| `src/index.css`, `vite-env.d.ts` | KEEP |

**ERP business logic — REMOVE**
| Path |
|---|
| `src/pages/{Landing,StartTrial,PublicBooking,Dashboard,AdminDashboard,AdminInvoices,AdminPayments,AdminSystemSettings,Appointments,Billing,Customers,Expenses,Inventory,Jobs,NewSale,Packages,PaymentVerification,PromoCodes,Reports,Salons,Services,Settings,Staff,TrialRequests,Users,ContactMessages}.tsx` |
| `src/components/settings/{AppearanceSettings,BranchSettings,BusinessHoursSettings,NotificationSettings,PaymentSettings,SmsMarketing,SubscriptionSettings}.tsx` |
| `src/components/billing/PrintInvoice.tsx`, `components/booking/{BookingModal,PaymentBlockModal}.tsx` |
| `src/components/ui/SalonSwitch.tsx` (super-admin salon impersonation switcher) |
| `src/hooks/{useAppointments,useBilling,useCustomers,useInventory,useSalons,useServices,useSettings,useStaff,useUsers}.ts` |
| `src/schemas/{Appointment,Customer,Salon,Service,Staff,User}Schema.ts` |
| `src/services/{Appointment,Customer,Salon}Service.ts` |
| `src/themes/{dark,elegant,modern,rose,spa}.tsx` — public-booking-widget visual themes, not a general theme system |
| `src/Assets/*` (salon logos, hero image) — placeholder branding, replace with your own |

### 5.4 Tests (`e2e/`)

| Path | Verdict |
|---|---|
| `playwright.config.ts`, `global.setup.ts`, `helpers/api.ts`, `helpers/auth.ts`, `.env.test.example`, `.gitignore` | **KEEP** — generic Playwright harness (`AuthState` has a `salon_id` field to drop later) |
| `tests/security/01-auth-endpoints.spec.ts` | KEEP — generic auth security tests |
| `tests/security/02-unauthenticated-access.spec.ts` | KEEP — generic |
| `tests/security/04-admin-protection.spec.ts` | KEEP — generic |
| `tests/security/05-storage-security.spec.ts` | KEEP — generic |
| `tests/security/06-tenant-isolation.spec.ts` | **REMOVE** — salon multi-tenancy specific |

---

## 6. Open judgment call: multi-tenancy

The `TenantContext` / `TenantAwareRepository` / `TenantMiddleware` stack is the one piece that's architecturally
elegant but 100% motivated by the ERP's "one salon per account" model. Two options for Step 3:

1. **Drop it entirely** — simplest path to a clean shell. `BaseRepository` alone covers a single-tenant
   ecommerce store. Delete `TenantContext.php`, `TenantAwareRepository.php`, `TenantMiddleware.php`, the
   `X-Target-Salon-Id` header logic, and `salon_id`/`branch_id` fields from JWT payload, `useAuthStore`, etc.
2. **Keep the pattern, gut the contents** — useful if the eCommerce site will ever be multi-vendor/multi-store.
   Keep the three files but strip `TenantMiddleware::handle()` down to just setting the tenant ID from the
   JWT, with no inline migrations and no subscription blocking.

I'd default to **option 1** unless multi-vendor is on the roadmap — it removes an entire abstraction layer
that Step 3 would otherwise need to keep half-alive. Flagging it here rather than deciding unilaterally.

---

## 7. What Step 3 will need to touch beyond deletion

Because of the `KEEP*` items above, Step 3 isn't pure deletion — a handful of files need edits to remove
their ERP-specific slice while keeping the surrounding skeleton (`routes/api.php`, `JWTService`,
`AuthController`, `TenantMiddleware`/deletion per §6, `useAuthStore`, `routes.ts`, `Sidebar.tsx`,
`Navbar.tsx`, `DashboardLayout.tsx`, `api/client.ts`, `queryKeys.ts`, `package.json`/`vite.config.ts` deps).
This will be called out again after your approval, before any changes are made.
