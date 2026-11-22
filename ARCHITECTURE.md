# Architecture

## Current architecture (updated 2026-11-22). Read this first

Sections 1–5 below describe the original skeleton and are kept as history. Some of it no longer matches the code: the frontend is **Next.js**, not Vite, and the admin talks to the **real PHP API**, not mocks. This summary is the current state.

| Layer | What runs |
|---|---|
| Storefront + admin | Next.js 15 App Router (`frontend/`). Storefront under `src/app/[locale]/(storefront)` (en/ar via next-intl); admin under `src/app/admin` (English only, client-rendered) |
| API | Hand-rolled PHP 8.3 framework (`backend/`): `Router` → middleware → Controller → Service → Repository over PDO. Entry point `backend/public/index.php`, routes in `backend/routes/api.php` under `/api/v1` |
| Database | MySQL/InnoDB. Migrations in `backend/database/migrations`, run with `php backend/console.php migrate` |
| Auth | JWT access token (15 min) + refresh token, HttpOnly cookies or Bearer header, optional TOTP 2FA, Google/Facebook login |
| Authorization | `AuthMiddleware` → `RoleMiddleware` (`admin` for `/api/v1/admin/*`) → `PermissionMiddleware` for sensitive routes. Super admins (`users.is_super_admin`) hold every permission; other admins only what is granted in `user_permissions` (catalogue: `App\Support\Permissions`). Permissions are read from the database on every check, never trusted from the token |
| Files | Public assets: `backend/public/uploads/{type}` served by `StorageController`. Sensitive files (dealer documents, payment proofs): `backend/storage/private` via `App\Core\PrivateStorage`, outside the web root, streamed only by endpoints that check ownership or an admin permission |
| Email | Every email goes through `App\Services\Mail\EmailOutbox` (`notification_outbox` table). Delivered right after the response; failures retried by `php console.php notifications:dispatch` (cron, every minute). Admin view: Settings → Email Log. No SMS |
| Background jobs | Cron calls `console.php`: `notifications:dispatch` (every minute), `fulfillor:sync` (every 5 minutes) |
| 3PL | Fulfillor (`backend/app/Services/Fulfillment`) |
| Payments | Cash on Delivery and Bank Transfer in practice; checkout still records a mock payment until the payment-method work (B2B plan, Phase 3) lands. The card gateway is on hold |
| Cart | Client-side (`useCartStore`, localStorage). Prices are always recalculated server-side at checkout, so a tampered cart can't change what is charged |
| Tests | Playwright API tests in `e2e/` (`tests/security`, `tests/b2b`) |
| Deploy | GitHub Actions → FTP (`.github/workflows/main.yml`); the root `.htaccess` it writes blocks source, `scratch/` and `storage/` |

The B2B dealer portal plan and its current progress are in [`docs/b2b-integration/`](docs/b2b-integration/).

---

## History: original skeleton notes

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
    SeedAdminUser.php               — seeds one admin@example.com / admin123 user (renamed from AdminSeeder.php — see §6.1 note)
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

## 5. Follow-ups from the cleanup phase

1. ~~No `users` table migration~~ — **resolved in Phase 1** (§6 below).
2. ~~`PrivacyPolicy.tsx` salon-specific content~~ — **moot**: the entire Vite frontend, including this file,
   was replaced by the Next.js app in Phase 1.
3. ~~`locales/en.json`/`si.json` salon strings~~ — **moot**, same reason; Phase 1 ships fresh `messages/en.json`
   and `messages/ar.json`.
4. **e2e specs** still reference old role names/fixtures — not yet updated for the `admin`/`customer` model.
5. **`composer.json`** declares real dependencies (`vlucas/phpdotenv`, `firebase/php-jwt`, `monolog`) that
   are not actually used — the app runs on the manual autoloader/custom JWT. Still undecided.
6. **Unrelated security pass** (rate limiting, a SQL-injection fix, 2FA) — preserved as-is, documented in
   `SECURITY.md`.

---

## 6. Phase 1 — UAE Auto Parts eCommerce Build

**Stack decision**: the Vite SPA described in §3 above has been **replaced** by a Next.js 15 App Router
project (same `frontend/` folder, full history preserved via git) for SSR/SEO. The PHP backend keeps the
exact architecture from §2 — no framework change, same Router/Request/Response/Middleware/Repository
pattern — just new migrations, seeders, and a response-envelope rename.

### 6.1 Backend changes

- **Response envelope renamed** to match the spec exactly: `{ success, data, error, message }`
  (`app/Core/Response.php`, `app/Controllers/BaseController.php`). The old key was `errors` (array); every
  existing call site already passed `null` for it, so this was a zero-risk rename — verified via a live
  `POST /auth/login` returning the new shape.
- **JWT access+refresh middleware, global error handler, bcrypt hashing, prepared statements everywhere** —
  all pre-existing from the cleanup phase, reconfirmed intact (nothing in Phase 1 touches `JWTService`,
  `AuthMiddleware`, or the PDO/prepared-statement layer).
- **New database**: the local MySQL still had the *entire old salon ERP schema* under `salon_saas` (deleting
  migration *files* during cleanup never touched the already-applied live tables). Rather than layer a new
  domain onto old salon tables, `backend/.env` now points at a fresh `autoparts_uae` database
  (`APP_NAME` updated too). `salon_saas` is untouched if you still need it for anything.
- **15 new migrations** in `backend/database/migrations/` (see §6.2 for the schema) — all written in the
  existing raw-SQL-in-a-`Migration`-subclass style (matching historical migrations like
  `create_staff_service_commissions_table.php`), not the limited `Schema::create()` DSL, since the DSL has
  no support for composite indexes, `JSON` columns, or `ENUM` — all of which this schema needs.
- **New seeders** (same standalone-script convention as the old `AdminSeeder.php`): `SettingsSeeder.php`
  (vat_rate, currency, site_name, support_email, whatsapp_number, ga_tracking_id, stripe_publishable_key) and
  `SeedCmsPages.php` (bilingual Terms & Conditions / Refund Policy / Privacy Policy shells).
- **Unexplained**: `backend/database/seeders/AdminSeeder.php` and a first attempt at a pages seeder named
  `PagesSeeder.php` were repeatedly deleted from disk (confirmed via a reproducible `EPERM` rename failure,
  not just a one-off) despite nothing in this session's commands targeting them — most likely local
  antivirus/EDR software on this machine flagging the filename pattern (a PHP file named `AdminSeeder`
  seeding hardcoded `admin`/`admin123` credentials resembles a known malicious-dropper naming convention).
  Worked around by renaming to `SeedAdminUser.php` and `SeedCmsPages.php`, which wrote successfully. The
  underlying seeded data was unaffected (already in the database from an earlier successful run) — only the
  script files themselves disappeared. Worth checking your antivirus quarantine/logs if this recurs.
- **Formalized three tables** that the existing auth code was previously self-provisioning via ad-hoc
  runtime `CREATE TABLE IF NOT EXISTS`/`ALTER TABLE` calls: `refresh_tokens`, `login_attempts`,
  `two_factor_recovery_codes`. The runtime provisioning code (`AuthController::ensureLoginAttemptsTable()`,
  `TwoFactorService::ensureSchema()`) was left untouched — it's now a harmless no-op since migrations create
  these tables first, but removing it wasn't necessary for this phase.
- **Round 2, after your review**: added `brands` (replacing the free-text `products.brand` column),
  `suppliers` (backing the 3PL feed properly instead of a loose `source_supplier_id` string), `carts` +
  `cart_items` (no cart table existed at all before this), and `reviews`. See §6.2 for all four.

**Verified live** against the fresh `autoparts_uae` database: all 21 migrations ran clean in order (FKs
resolved correctly, including the `ALTER TABLE products` that drops `brand` and adds `brand_id`/
`supplier_id`), all 3 seeders ran clean, `SHOW INDEX`/`information_schema` confirmed every required index
and FK exists, an `EXPLAIN` on `WHERE year = 2020 AND make = 'Toyota'` showed `type: ref` using
`uq_vehicles_year_make_model` (not a table scan), a live insert proved `reviews.rating`'s
`CHECK (rating BETWEEN 1 AND 5)` actually rejects out-of-range values, and a full login round-trip
(`POST /auth/login` → `GET /auth/me`) through a running PHP dev server returned the new
`{success, data, error, message}` shape correctly.

> **Known limitation carried over from the existing migration runner**: `console.php migrate` has no
> ledger table tracking which migrations already ran — it just re-executes every file's `up()` every time,
> the same way the historical ERP migrations worked. That's harmless for `CREATE TABLE IF NOT EXISTS`
> migrations (idempotent no-ops), but `2026_07_04_000018_alter_products_add_brand_and_supplier.php` uses a
> plain `ALTER TABLE ADD/DROP COLUMN` and will fail if run a second time against the same database. Not
> fixed here since it matches the pre-existing convention (e.g. the historical
> `add_two_factor_to_users_table` migration had the same one-shot-only characteristic) — worth revisiting if
> you want migrations to be safely re-runnable.

### 6.2 Database schema

| Table | Purpose | Key indexes |
|---|---|---|
| `users` | Customers + admins, `role` ENUM(`admin`,`customer`) for RBAC, bcrypt `password`, 2FA columns baked in | UNIQUE(`email`), INDEX(`role`) |
| `refresh_tokens` | JWT refresh tokens, revocable | UNIQUE(`token`), INDEX(`user_id`) |
| `login_attempts` | Rate-limit lockout state (existing `AuthController` logic) | PK(`email`) |
| `two_factor_recovery_codes` | 2FA recovery codes (existing `TwoFactorService` logic) | INDEX(`user_id`) |
| `customer_addresses` | Saved UAE delivery addresses — `emirate` ENUM (all 7), `city`/`area`/`landmark` fields matching how UAE addresses are actually written | INDEX(`user_id`) |
| `categories` | Hierarchical (`parent_id` self-FK), bilingual `name_en`/`name_ar`/`description_en`/`description_ar` | UNIQUE(`slug`), INDEX(`parent_id`) |
| `vehicles` | Year/Make/Model catalog for the fitment search | **UNIQUE(`year`,`make`,`model`)** composite — see §6.3, plus INDEX(`make`), INDEX(`model`) |
| `brands` | Bilingual brand catalog (e.g. Bosch, Denso) — replaces the old free-text `products.brand` | UNIQUE(`slug`) |
| `suppliers` | 3PL feed sources — name, contact, API endpoint, sync status | UNIQUE(`slug`) |
| `products` | Bilingual fields, `sku`, `price`, `stock_quantity`, `images` (JSON array), `source` ENUM(`local`,`3pl`), `brand_id`/`supplier_id` FKs + `source_supplier_id`/`source_synced_at` for the 3PL feed | UNIQUE(`sku`), UNIQUE(`slug`), **INDEX(`category_id`)**, INDEX(`brand_id`), INDEX(`supplier_id`) |
| `product_vehicle` | Product ↔ vehicle fitment mapping | **UNIQUE(`vehicle_id`,`product_id`)** composite — see §6.3, plus INDEX(`product_id`) |
| `carts` / `cart_items` | Server-side cart — `carts.user_id` nullable for guest carts (identified by `session_token` instead), `cart_items.price_at_add` for "price changed" UX | UNIQUE(`session_token`), UNIQUE(`cart_id`,`product_id`) |
| `reviews` | Product reviews — moderated (`is_approved` defaults false), optional `order_id` link, `rating` enforced 1–5 via `CHECK` constraint | UNIQUE(`product_id`,`user_id`) |
| `orders` | `vat_rate`/`vat_amount` **snapshotted per order** (so an admin editing the VAT setting later never rewrites past invoices), `shipping_snapshot` JSON (address snapshotted at checkout — `customer_addresses` rows can change/be deleted later without corrupting order history), Stripe `payment_reference` | UNIQUE(`order_number`), **INDEX(`user_id`,`created_at`)**, INDEX(`status`) |
| `order_items` | Line items, `sku`/`name_en`/`name_ar`/`unit_price` snapshotted at order time | INDEX(`order_id`), INDEX(`product_id`) |
| `order_status_history` | Audit trail of status changes, optional `changed_by` admin | INDEX(`order_id`) |
| `settings` | Key-value store (`vat_rate`, `whatsapp_number`, `ga_tracking_id`, etc.), `type` ENUM drives admin-UI input rendering | UNIQUE(`key`) |
| `pages` | Dynamic bilingual CMS pages (Terms, Refund Policy, Privacy Policy, seeded) | UNIQUE(`slug`) |
| `seo_meta` | Per-page/category/product/custom-path bilingual SEO overrides | UNIQUE(`path`), INDEX(`page_type`,`reference_id`) |

20 tables total. A consolidated, standalone copy of this schema (dumped directly from the live database, so
it's guaranteed accurate) lives at [`DB_Schema.sql`](DB_Schema.sql) in the project root.

Not yet built (deliberately out of scope for Phase 1, which was schema + frontend scaffold only): any
Controller/Service/Repository for categories/products/vehicles/orders/carts/reviews, the 3PL sync job,
Stripe integration, and the admin panel. Those come in a later phase once you've approved this schema.

### 6.3 Why the composite indexes are safe under load

- **`vehicles`**: the search flow drills down Year → Make → Model left-to-right. A single composite
  `UNIQUE(year, make, model)` index serves *all three* steps as leftmost-prefix lookups (`year` alone,
  `year+make`, `year+make+model`) — confirmed via `EXPLAIN` showing `type: ref` (indexed lookup, not a scan)
  even on a query filtering only `year` + `make`.
- **`product_vehicle`**: the hot path is "customer picked a vehicle, list every compatible product" — a
  lookup *by* `vehicle_id`. The composite key is `(vehicle_id, product_id)`, not `(product_id, vehicle_id)`,
  specifically so that direction is the indexed one. A secondary `INDEX(product_id)` covers the reverse
  direction (a product's fitment list in the admin panel) without needing a second composite key.
- **`orders(user_id, created_at)`**: exactly as requested — a customer's order history page queries
  `WHERE user_id = ? ORDER BY created_at DESC`, which this composite index serves directly (no filesort).

### 6.4 Frontend (`frontend/`) — Next.js structure

```
frontend/
  next.config.ts              — wraps next-intl plugin
  tailwind.config.ts           — design tokens only (see §6.5), content globs updated for App Router
  postcss.config.js
  tsconfig.json
  messages/
    en.json, ar.json           — next-intl translation catalogs
  src/
    middleware.ts               — next-intl locale routing (always-prefixed: /en, /ar)
    i18n/
      routing.ts                 — locales, defaultLocale, isRtl() helper
      navigation.ts               — locale-aware Link/router (wraps next/navigation)
      request.ts                  — next-intl server request config (loads messages per locale)
    app/
      globals.css                 — CSS-variable design tokens (same shadcn-style pattern as the old Vite app)
      providers.tsx               — client component: TanStack Query + react-hot-toast
      robots.ts                   — dynamic robots.txt (App Router convention, replaces the old static file)
      [locale]/
        layout.tsx                — root HTML shell per locale: sets lang/dir, loads Inter (Latin) + Cairo (Arabic) fonts
        (storefront)/             — The main store UI
          layout.tsx              — Storefront wrapper (header, footer, MSW provider)
          page.tsx                — Home: hero + static Year/Make/Model search UI
          shop/                   — Product catalog, listing, filters, search
          account/                — Customer dashboard (protected). See frontend/ACCOUNT_SECTION.md for details.
        login/page.tsx            — full login flow ported from the old Vite app: 2FA-aware, wired live to the PHP backend
        change-password/page.tsx  — placeholder (flow not built yet)
    components/ui/
      Button.tsx, Input.tsx        — same cva/forwardRef pattern as the old Vite `components/ui/`, re-themed onto the new design tokens
    lib/
      utils.ts                     — cn() helper (unchanged)
      api/client.ts                 — axios instance: HttpOnly cookies, single-flight 401-refresh-and-retry (same pattern as the old `api/client.ts`, locale-aware redirect on forced logout)
    store/useAuthStore.ts          — Zustand auth store (unchanged shape from the cleaned skeleton)
    services/BaseService.ts, AuthService.ts — unchanged pattern
    schemas/LoginSchema.ts          — unchanged
    hooks/useAuth.ts                — unchanged
    types/api.ts                    — ApiResponse<T> updated to the new {success,data,error,message} shape
```

**Removed**: everything Vite-specific (`vite.config.ts`, `index.html`, `tsconfig.node.json`,
`src/vite-env.d.ts`) and the stale salon-branded static assets in `public/` (images, `robots.txt`,
`sitemap.xml` — replaced by the dynamic `app/robots.ts` convention).

**Not ported from the old Vite app** (out of scope for this phase, or superseded): `ChangePassword.tsx`'s
full form (placeholder only for now), `PrivacyPolicy.tsx`, `Landing.tsx`'s marketing content, `SEO.tsx`
(Next.js's built-in `metadata` API replaces `react-helmet-async` — no direct port needed), and the
permission-matching hooks (`usePermissions`/`useCan`) — re-add once there's a real permission model beyond
`admin`/`customer`.

**Verified working**: `npm install` (158 packages), `tsc --noEmit` (zero errors), `npm run build` (both `/en`
and `/ar` statically prerendered via `generateStaticParams`), a live `next dev` server serving `/ar` with
`dir="rtl"` confirmed in the rendered HTML, and the login page completing a real
`POST /auth/login` → `GET /auth/me` round-trip against the PHP backend.

### 6.5 Theme tokens

Same CSS-variable + Tailwind-color-mapping pattern as the old Vite app (`globals.css` defines HSL triples,
`tailwind.config.ts` maps them to `bg-background`, `text-foreground`, etc.) — just repointed at the requested
UAE palette instead of the old indigo scheme:

| Token | Value (HSL) | Use |
|---|---|---|
| `--background` | `0 0% 100%` | Clean white page background |
| `--secondary` / `--muted` | `210 20% 96%` | Light gray section backgrounds |
| `--foreground` | `222 47% 11%` | Dark charcoal/navy body text and headers |
| `--primary` | `217 71% 25%` | Navy blue accent — buttons, links, active states |
| `--border` / `--input` | `214 32% 91%` | Light gray borders |
| `--destructive` | `0 72% 51%` | Error states |

No dark mode — a single light theme, since that's what was requested. `Button`/`Input` components reference
these tokens exclusively (no hardcoded colors), so a future palette change is a one-file edit in
`globals.css`.

### 6.6 Open items for your review

1. ~~Multi-vendor/3PL product identity~~ — **resolved**: added a `suppliers` table + `products.supplier_id` FK.
2. **Guest checkout**: `orders.user_id` is `NOT NULL` — Phase 1 assumes accounts are required to check out,
   per "Customer accounts with order history." Flag now if guest checkout is actually needed. (Note: `carts`
   already supports guest sessions via `session_token` — only `orders` currently forces an account.)
3. **`vehicles` has no `trim` column** — kept to exactly what was asked (year/make/model). Real parts
   fitment data often varies by trim/engine variant within the same year/make/model; worth deciding before
   the 3PL data import if that's a real gap for this catalog.
4. **Coupons/promo codes**: `orders.discount_amount` exists but nothing generates it yet — deferred per your
   choice; add a `coupons` table when that feature is prioritized.
5. **`suppliers.api_key`** stores a credential in a plain column — fine as a placeholder, but should be
   encrypted at rest or replaced with an env-var reference before any real API key goes in it.
6. **`e2e/` Playwright specs** are unrelated to this phase and still reference the old salon role model —
   not touched.

---

## 7. Phase 2 (in progress) — Security triage + schema finalization

### 7.1 Backend security fixes (Phase 0 of the build plan)

A full audit of every backend file (found via direct read, not summarized) turned up one critical issue and
several hardening gaps, all now fixed and verified live against `autoparts_uae`:

- **Critical — broken access control on `/api/v1/users*`**: every route had only `AuthMiddleware`, no role
  check. Any authenticated `customer` could list all users, create an admin account, self-promote their own
  `role` to `admin` via `PUT`, or delete any account. Fixed by moving these routes under a new
  `Router::group()` helper (`app/Core/Router/Router.php`) wrapping them in
  `[AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]` at `/api/v1/admin/*` — this group is now the
  standard pattern for every admin-only route going forward. `UserController` also gained explicit
  field-whitelisting (never spreads `$request->all()` into `create()/update()`) and self-lockout guards (an
  admin can't delete/demote/deactivate their own account). Caught live during testing (not in the static
  audit): the user list was also serializing every user's raw `two_factor_secret` — fixed.
- **`QueryBuilder::where()`** now validates column names (matching `orderBy()`'s existing regex) — closes a
  latent SQL-injection trap for future filterable list endpoints built on `BaseRepository::all($filters)`.
- **Rate limiting**: new generic `App\Services\RateLimiter` (keyed by `action` + `identifier`, table
  `rate_limits`) replaces the old email-only `login_attempts` lockout. Login is now throttled by *both* email
  (5/15min) and IP (20/15min); registration is IP-throttled (10/hr) — previously completely unthrottled,
  which combined with the 409 "email already exists" response made account enumeration trivial.
  `login_attempts` is superseded but left in place (harmless, unused).
- **Boot-time production safety guard** (`bootstrap/app.php`): refuses to boot if `APP_ENV=production` and
  either `APP_DEBUG=true` or `JWT_SECRET` is empty/the placeholder value/under 32 chars — verified it
  actually blocks and logs to `scratch/errors.log` rather than serving a broken app.
- **`App\Exceptions\DomainException`** — the only exception type whose `getMessage()` is safe to show a user
  (e.g. future "Product out of stock"). `public/index.php`'s global handler special-cases it before the
  generic `\Throwable` catch, which still logs the full trace server-side and returns a single generic
  message to the client — verified end-to-end with a forced DB failure.
- Cleanup: `JWT_EXPIRY` → `JWT_ACCESS_EXPIRY` naming bug fixed (the `.env` value was previously silently
  ignored), stale unrelated `salonflow.cloud` SMTP credentials replaced with neutral placeholders, dead
  `X-Target-Salon-Id` CORS header removed, `SimpleSmtpMailer` now strips CR/LF from header-bound inputs
  (defensive — still not wired to any caller).

### 7.2 Migrations ledger (pulled forward from the original Phase 1 plan)

`console.php migrate` previously replayed every migration file on every run — harmless for `CREATE TABLE IF
NOT EXISTS` migrations, but the one-shot `ALTER TABLE ... DROP COLUMN` in migration `000018` failed on
replay (the column was already dropped). Fixed properly instead of working around it again: a `migrations`
ledger table now records which migrations have run (by filename) and `batch` number; `migrate` only applies
new files, `migrate:rollback` reverts the most recent batch. The ledger was seeded with all 22 migrations
already applied to the live database before any new migration was written, so nothing replayed.

### 7.3 Schema finalized against the admin panel's existing mock data

The frontend admin panel (`frontend/src/mocks/admin/db.ts`) already has a fully-built mock data layer with
its own opinions about shape — discovered by checking it before finalizing the schema, which surfaced real
gaps the original 20-table schema didn't cover. `products`/`categories`/`orders`/`reviews`/`brands`/
`suppliers` all had 0 rows at this point, so every change below applied with zero data-migration risk.

**New tables** (8): `media` (shared asset library — `products.images` JSON now stores `media.id` references
rather than raw paths, so an asset can be reused/tracked from one place), `product_specifications`
(bilingual key/value spec rows — Voltage, Material, OEM Number — matching the admin mock's existing
`specifications` field), `wishlists`, `payment_transactions` (every Stripe attempt/webhook against an order,
separate from the single `orders.payment_reference` field, for retries/refunds/reconciliation),
`admin_activity_logs` (system-wide audit trail — who changed what), `admin_notes` (one generic
`entity_type`/`entity_id` table for both order and customer internal notes, instead of two near-duplicate
tables), and the `migrations`/`rate_limits` tables from §7.1/7.2.

**Altered tables**: `products.is_active` (boolean) replaced with `status`
`ENUM('draft','active','inactive')` to match the admin mock exactly, plus new `fits_all_vehicles`,
`low_stock_threshold`, `track_inventory`, `vat_inclusive` columns; `orders` gained `refund_requested_at` and
`cancellation_reason`.

**Indexing pass** — every addition verified live via `EXPLAIN`, not just assumed:
- `products`: `idx_products_category_id` replaced by composite `(category_id, status)` (same leftmost-prefix
  coverage for a plain category filter, plus the hot "category X, active only" storefront query in one
  index instead of two) — confirmed `type=ref` on that combined query. Added `idx_products_status`
  (cross-category admin filtering), `idx_products_price` (confirmed `type=range` on a price-range query),
  `idx_products_stock_status` + `idx_products_stock_quantity` (admin stock views), and a bilingual
  `FULLTEXT` index across `name_en/ar` + `short_description_en/ar` (confirmed `type=fulltext`, replacing
  what would otherwise be a leading-wildcard `LIKE` table scan for product search).
- `orders`: added `idx_orders_payment_status` and `idx_orders_created_at` (the existing
  `idx_orders_user_id_created_at` can't serve a customer-agnostic "recent orders" admin query since
  `user_id` is its leftmost column).
- `reviews`: added `idx_reviews_product_approved (product_id, is_approved)` for the storefront's "approved
  reviews for product X" query.
- `categories`: added `idx_categories_active_sort (is_active, sort_order)` for public listing.
- `users`: added `idx_users_is_active` for the admin customer list's active/blocked filter.
- `customer_addresses`: `idx_customer_addresses_user_id` replaced by composite `(user_id, is_default)` —
  same reasoning as the `products.category_id` change above.
- `settings`: added `idx_settings_group` (admin settings UI groups by tab).
- `carts`: added `idx_carts_status` (admin abandoned-cart reporting).

Where an old single-column index was replaced by a composite starting with the same column, the composite
was added *before* dropping the old index in the same migration — MySQL refuses to drop the only index
backing a foreign key, and both `products.category_id` and `customer_addresses.user_id` are FKs.

`DB_Schema.sql` was regenerated directly from `SHOW CREATE TABLE` against the live database (not hand-edited)
so it stays a guaranteed-accurate snapshot — 28 tables total as of this pass.

**Not yet built**: still no Controller/Service/Repository beyond auth/users — this pass was schema-only, per
your call to prioritize the admin panel backend next (categories/brands/vehicles/products CRUD).

### 7.4 Phase 2 — Admin panel catalog CRUD

Full Controller → Service → Repository stacks, all registered under the `/api/v1/admin/*` route group
(`AuthMiddleware` + `RoleMiddleware(['admin'])`) added in §7.1:

- **Categories** (`CategoryController`/`Service`/`Repository`): hierarchical CRUD with a live
  `products_count` per row (`LEFT JOIN` + `GROUP BY`, not an N+1 loop), cycle prevention when reassigning
  `parent_id` (walks the ancestor chain, rejects self-parenting or moving under one's own descendant), and
  delete guards (blocked if the category has subcategories or assigned products).
- **Brands**: same shape, no hierarchy. Delete blocked if any product still references the brand.
- **Vehicles**: Year/Make/Model CRUD plus a cascading `GET /vehicles/filters?year=&make=` endpoint (distinct
  years/makes/models) for the admin fitment picker — registered *before* `/vehicles/{id}` in the route table
  since the router matches in registration order and `{id}` would otherwise swallow `/vehicles/filters`.
- **Media**: a shared upload/list/delete library (`MediaController`/`Service`/`Repository`) — `products.images`
  stores an array of `media.id` values rather than raw paths, per §7.3. `FileUploader`'s MIME allow-list was
  extended to `webp`/`gif` (product photos, not just the original jpg/png/pdf) — MIME is still verified from
  actual file content via `finfo`, never the client-supplied name.
- **Products**: the full entity, including nested `specifications[]` and `vehicle_ids[]` in the same
  create/update request, plus two dedicated sub-resource endpoints
  (`PUT /products/{id}/specifications`, `PUT /products/{id}/vehicles`) for an admin UI with separate tabs.
  Every multi-statement write (product row + specs replace + fitment replace) is wrapped in a
  `DatabaseManager` transaction with rollback on any failure, so a fitment-insert error can never leave a
  product with half-updated specifications. `images`/`vehicle_ids` are validated against the database in one
  `WHERE id IN (...)` query each, not a query per element.

**Shared additions this required**:
- `QueryBuilder::whereSearch()` (multi-column `LIKE` search, one placeholder per column since this app runs
  with `PDO::ATTR_EMULATE_PREPARES=false` and MySQL's native prepared statements reject reusing a named
  placeholder) and `QueryBuilder::buildCount()` (same accumulated `WHERE` as `buildSelect()`, for pagination
  totals) — used by every list endpoint above.
- `BaseRepository::findBy()`, `::existsExcluding()` (the standard "is this slug/SKU taken by someone else"
  check on update), and `::count()`.
- `slugify()` helper (`app/Helpers/functions.php`) for every entity's slug generation.
- Every create/update path uses `App\Exceptions\DomainException` for user-facing failures (duplicate
  slug/SKU, invalid foreign key, cycle detected, delete blocked) — verified live that each one returns its
  specific message and status code, not a generic 500.

**Bug found and fixed during this phase**: `app/Helpers/functions.php` (`env()`, `dd()`, `sanitize()`, now
also `slugify()`) was never actually loaded. `composer.json` declares it as an autoload `files` entry, but
this app runs on the manual autoloader (`bootstrap/manual_autoload.php`), not Composer — that declaration was
dead. Confirmed dormant (nothing in the codebase called any of those three original functions, so it never
surfaced) until `slugify()` was added and immediately failed at runtime. Fixed by `require_once`-ing the
file directly in `manual_autoload.php`.

**Verified live** end-to-end against `autoparts_uae` (all test data cleaned up afterward): category hierarchy
+ cycle rejection, brand/vehicle CRUD, duplicate SKU/slug/year-make-model all correctly rejected (409),
invalid `category_id`/`brand_id`/`vehicle_ids`/`images` all correctly rejected (422) instead of raising a raw
FK-constraint error, delete guards on categories/brands with assigned products (409), a full product created
in one request with 2 specifications and 1 vehicle fitment row, the dedicated specifications/fitment
sub-resource endpoints, a partial update touching only `price` leaving everything else untouched, bilingual
Arabic content round-tripping correctly end-to-end (an initial "???" was traced to a shell/terminal encoding
artifact in the test command, not the API — re-verified via a UTF-8 file payload), and a plain `customer`
role correctly getting `403` on every one of these endpoints.

**Not yet built**: supplier CRUD (suppliers are validated as a product foreign key but have no admin
CRUD yet — deferred to the payments/3PL phase per the original plan), storefront-facing public read
endpoints (Phase 5), and the `FULLTEXT` product search index added in §7.3 isn't queried by anything yet
(admin product search intentionally uses `LIKE` instead — see `ProductRepository::buildWhere()` — since
admins commonly search partial SKUs, which natural-language `FULLTEXT` handles poorly; `FULLTEXT` is
reserved for the storefront search phase).

### 7.5 Phase 3 — Admin panel store configuration

Same Controller → Service → Repository pattern, registered under the same `/api/v1/admin/*` group:

- **Settings** (`SettingController`/`Service`/`Repository`) — list (grouped), get/update/delete by `key`
  (the natural identifier, not `id`), create, and a `PUT /settings/bulk` endpoint for a settings page that
  submits several fields in one save. Values are validated against the row's `type`
  (`string`/`number`/`boolean`/`json`) before being written — a `boolean`-typed setting rejects anything that
  isn't `true`/`false`/`1`/`0`, a `number`-typed one rejects non-numeric input. The 7 seeded core settings
  (`vat_rate`, `currency`, `site_name`, `support_email`, `whatsapp_number`, `ga_tracking_id`,
  `stripe_publishable_key`) are protected from deletion since checkout/branding code depends on them existing.
- **Pages**: bilingual CMS page CRUD (Terms/Refund Policy/Privacy Policy, already seeded from Phase 1, plus
  any new ones) — slug uniqueness, derived from `title_en` when not supplied.
- **SEO Meta**: CRUD for per-page/category/product/custom-path SEO overrides — `reference_id` is validated
  against the actual `pages`/`categories`/`products` table when `page_type` requires one (not just "any
  integer"), and `path` is unique.
- **Suppliers**: CRUD with `api_key` **encrypted at rest** — resolves the audit finding from §6.6. A new
  `App\Core\Encryption` (AES-256-CBC, key from `APP_ENCRYPTION_KEY`) encrypts on write; the plaintext/ciphertext
  is **never returned by any endpoint** — API responses only expose a `has_api_key` boolean, and updating a
  supplier without providing a new `api_key` leaves the stored one untouched (verified live: `PUT` with only
  `{"status":"inactive"}` left the encrypted value intact and still correctly decryptable). A
  `SupplierRepository::getDecryptedApiKey()` method exists for later backend-only use (the Phase 7 3PL sync
  job) and is deliberately not wired to any Controller. `APP_ENCRYPTION_KEY` was added to the Phase 0
  production boot guard (`bootstrap/app.php`) alongside `JWT_SECRET` — refuses to boot if missing or not a
  valid base64 32-byte key.

**Bug found and fixed during this phase**: `BaseRepository::create()`/`update()`/`findBy()`/`existsExcluding()`
and `QueryBuilder::where()`/`orderBy()`/`whereSearch()` all interpolated column names into SQL unquoted.
`settings.key` is a MySQL reserved word — the very first live test (`INSERT INTO settings (key, value, ...)`)
threw a raw SQL syntax error. Fixed at the framework level (backtick-quoting every already-validated column
name, splitting on `.` for `table.column` references in `QueryBuilder`) rather than special-casing `settings`,
so every repository — present and future — is protected from this same class of bug, not just this one table.

**Verified live** end-to-end (test data cleaned up afterward): the reserved-word fix confirmed directly
against the `settings` table; full settings list/create/update/bulk-update; boolean-type validation rejecting
`"yes"` and accepting `"true"`; the protected-key delete guard (409 on `vat_rate`, success on a custom key);
page slug-collision correctly detected against the existing seeded pages; a supplier created with a real
`api_key`, confirmed encrypted at rest (raw DB value is ciphertext, `Encryption::decrypt()` recovers the
original), confirmed **not** present in any API response, and confirmed untouched by an update that didn't
include it; SEO entries with a valid `reference_id`, an invalid one (422, not a raw FK error), and a `custom`
type requiring no reference at all.

**Not yet built**: order/review management (Phase 4), storefront public endpoints (Phase 5), cart/checkout
(Phase 6), and the Phase 7 3PL sync job that will be the first real caller of
`SupplierRepository::getDecryptedApiKey()`.

### 7.6 Phase 4 — Admin panel orders, reviews & dashboard

No public checkout exists yet (Phase 6), so this phase's live testing used directly-seeded sample
data (one customer, category, product, order + item, review — all cleaned up afterward), per the original
plan's call to build order management ahead of the storefront that will eventually create real orders.

- **Orders** (`OrderController`/`Service`/`Repository`): list (customer name/email joined in, filter by
  `status`/`payment_status`/`user_id`, search by order number or customer), detail (items + status history +
  internal notes all embedded in one response), `PUT /orders/{id}/status`, `PUT /orders/{id}/payment-status`,
  and `POST /orders/{id}/notes`.
  - A **terminal-state guard**: once an order reaches `delivered`, `cancelled`, or `refunded`, no further
    status change is accepted (409) — verified live.
  - Cancelling an order requires a non-empty `cancellation_reason` in the same request (422 without one) —
    verified live.
  - Every status change appends an `order_status_history` row (who, when, optional note) rather than just
    overwriting `orders.status` — the existing schema's audit trail is actually populated now.
  - Marking `payment_status = refunded` auto-stamps `refund_requested_at` if it wasn't already set, and logs
    an `admin_notes` entry recording the change.
- **Reviews** (`ReviewController`/`Service`/`Repository`): moderation list (reviewer + product name joined
  in, filter by `is_approved`/`product_id`/`rating`, search by title/comment/reviewer), approve, reject
  (both just flip `is_approved` — the row isn't deleted, so a rejected review can be re-approved later), and
  a hard delete for spam/abuse.
- **Dashboard** (`DashboardController`/`Service`): a single `GET /dashboard/stats` returning counts
  (customers, admins, products, categories, orders, pending orders, total revenue from paid orders, reviews,
  pending reviews, low-stock and out-of-stock product counts). Deliberately has no backing Repository — it's
  a cross-table reporting aggregate, not an entity with a row lifecycle — and confirmed live that every
  number moves correctly as the seeded order/review's state changed (e.g. `pending_orders` and
  `pending_reviews` both dropped to 0 immediately after the corresponding status changes above).
- **`AdminNoteRepository`**: the generic `entity_type`/`entity_id` table designed back in §7.3 has its first
  real caller here (`entity_type = 'order'`) — confirmed reusable as designed, with no order-specific schema
  needed.

**Verified live** end-to-end (test data cleaned up afterward): dashboard stats matched seeded state exactly;
order list/detail with joined customer info and embedded items/history/notes; adding a note; a full
`pending → processing → delivered` status walk with history entries recorded at each step; invalid status
(422), cancel-without-reason (422), and post-terminal-state change (409) all correctly rejected; review list
filtered to pending, approve flipping `is_approved`, and the dashboard's `pending_reviews`/`pending_orders`
counts both reflecting the changes on the next call.

**Not yet built**: customer-side admin management (block/unblock, customer-scoped notes via the same
`admin_notes` table with `entity_type = 'customer'`) — the frontend mock has this, but it wasn't in the
approved Phase 4 scope; easy to add later since `AdminNoteRepository` already supports it. Also still
pending: storefront public endpoints (Phase 5), cart/checkout (Phase 6, the first real source of orders),
and Phase 7 payments/3PL sync.

---

## 8. Frontend ⇄ backend integration (in progress)

The Next.js admin panel (`frontend/src/app/admin/`) was already fully built — 19 pages — against MSW mocks
(`frontend/src/mocks/admin/`). Before continuing backend Phases 5–7, the priority shifted to connecting the
two sides. Full research + the phased plan (F0–F10) live in the plan file; this section tracks what's
actually been done.

### 8.1 Phase F0 — Auth unification + shared HTTP client

Research (3 parallel Explore agents) found the admin panel ran on a **second, incompatible API/auth stack**:
Bearer token read from `localStorage`, hitting a mock `/api/admin/login` that returned tokens in the JSON
body. The real backend only issues tokens via `Set-Cookie` (`AuthController::login`) — that flow could never
have worked against the real backend as-is, and storing a JWT in `localStorage` (XSS-readable) contradicted
the HttpOnly-cookie design the whole backend was built on. Fixed by unifying onto the same pattern already
proven by the storefront/login page:

- **`src/lib/admin/api-client.ts`** (`adminApi.{get,post,put,patch,delete}`) — same public method signatures
  (zero changes needed across the 19 admin pages that call through it), but now delegates to the shared
  `apiClient` (axios, `withCredentials`, existing 401-refresh-retry interceptor) with an `/admin` path prefix,
  instead of a hand-rolled `fetch` + Bearer implementation. Axios errors are still translated into the same
  `ApiError` class every existing page's `catch`/`onError` handler already expects.
- **`src/lib/admin/hooks/useAdminAuth.ts`** — `useAdminLogout`/`useAdminMe` now call `AuthService`/
  `useAuthStore` (the real pattern) instead of the retired mock-token flow; `useAdminMe` always re-validates
  the session via `GET /auth/me` on every protected-page mount (there's no client-readable token to gate on
  by design).
- **`RequireAdminAuth.tsx`** — no longer checks a `localStorage` token; validates via `useAdminMe()` and
  redirects to `/admin/login` unless the session is valid **and** `role === 'admin'` (a `customer` who somehow
  authenticates is logged out and redirected, not just UI-hidden).
- **Admin login page** — rewritten to call `apiClient.post("/auth/login", ...)` directly (mirroring the
  storefront login page's proven pattern exactly, including 2FA `2FA_REQUIRED` handling), reads
  `err.response.data.message` for errors, and explicitly rejects a successful-but-non-admin login.
- **Retired entirely**: `useAdminAuthStore.ts` (separate `AdminUser` type/Zustand store) and
  `src/lib/admin/auth.ts` (localStorage token helpers) — deleted, no remaining references.
- **Downstream fixes required** (both imported the retired store directly): `Topbar.tsx` now reads the user
  from `useAuth()`. The profile page was rebuilt around what the backend actually supports — change password
  wired to a new `AuthService.changePassword()` (maps directly to the existing `/auth/change-password`
  endpoint) — and avatar upload / notification preferences / name-editing were **removed**, not half-wired,
  since the backend has no `avatar_url` column, no notification-preferences concept, and no profile-update
  endpoint. Consistent with the same "hide what has no backend support" call made for analytics/reports/bulk
  actions elsewhere in this plan.
- **Env vars**: collapsed to one `NEXT_PUBLIC_API_BASE_URL`; `NEXT_PUBLIC_ADMIN_API_URL` retired (adminApi
  derives `/admin` internally now); `NEXT_PUBLIC_ADMIN_USE_MOCKS=false` in `.env.local`.

**Verified live** with a real Playwright-driven browser session (no `chromium-cli` available in this
environment, so a small Node script using `@playwright/test`'s `chromium` launcher was used instead, run from
`e2e/` to resolve its already-installed browser binaries — removed after use): `POST /auth/login` hit the
real PHP backend and returned the real envelope; `access_token`/`refresh_token` HttpOnly cookies were set;
redirect to `/admin/dashboard` succeeded; `GET /auth/me` on the protected layout validated the session;
`GET /admin/dashboard/stats` returned real live data matching actual DB state
(`total_admins: 1`, everything else `0`). One hiccup during verification — a leftover dev-server process
from an earlier restart was still holding port 3000, and clearing `.next` while it kept running corrupted its
build (chunk 404s prevented React from ever hydrating, so the login form silently fell back to a native HTML
GET submission with credentials in the URL query string — not a code bug, a stale-process artifact). Killing
every process on ports 3000/3003 and starting exactly one clean instance resolved it.

**Confirms the next gap to fix (Phase F1)**: the dashboard already pulls live data through the now-fixed
`adminApi` pipe with zero page-level changes, but renders `NaN%`/`undefined` for fields the mock provided
that `/admin/dashboard/stats` doesn't (day-over-day comparisons), and two chart panels spin forever since
`GET /admin/dashboard/analytics` 404s (no backend, per the approved plan's decision to hide rather than
half-wire analytics).

### 8.2 Phase F1 — Dashboard

`src/app/admin/(protected)/dashboard/page.tsx` rewritten around what `DashboardService::stats()` (Phase 4)
actually returns, rather than the richer mock shape:

- **KPI cards**: `Today's Sales`/`Orders Today`/`New Customers Today` (all required day-partitioned data
  that doesn't exist — building that is real analytics-aggregation work, deliberately out of scope per your
  decision) replaced with `Total Revenue`/`Total Orders`/`Total Customers` — real all-time totals, using the
  `StatCard` component's existing `caption` prop (already designed for exactly "no day-over-day comparison
  available") instead of the `trend` prop. `Low Stock Alerts` was already a direct match, untouched.
- **Charts row**: the two Chart.js panels (`daily_traffic`, `daily_revenue` — both required
  `/dashboard/analytics`, which 404s) replaced with a "Reporting & analytics — coming soon" placeholder,
  reusing the exact dashed-border/icon style the page already had for its GA-not-connected state. The
  `chart.js`/`react-chartjs-2` imports were removed from this file (still used elsewhere, by the Reports
  page's report components — untouched, see below).
- **Low Stock widget bug fix**: was filtering `stock_quantity <= 5` (a hardcoded guess). Changed to match
  `DashboardService::stats()`'s own definition — `track_inventory && low_stock_threshold != null &&
  stock_quantity <= low_stock_threshold` — so the widget and the KPI card's count agree with each other,
  using the real per-product field added back in Phase 2/§7.3 instead of a magic number.
- **Recent Orders / Low Stock list**: already worked with zero changes — both were already calling the real,
  already-connected `/orders` and `/products` list endpoints through `adminApi`.

**Investigated but not touched**: the Reports page (`src/app/admin/(protected)/reports/page.tsx`) — despite
being named in the same "hide, don't half-wire" decision — turned out to need no changes at all. It computes
every report client-side from `/orders`, `/products`, and `/categories` (already-real endpoints), and never
calls the mock's `/reports/sales` endpoint in the first place. One real gap surfaced while reading it,
earmarked for Phase F2 rather than fixed here (out of Dashboard's scope): it calls
`useAdminQuery<Category[]>(..., "/categories")` expecting a flat array, but the real endpoint returns the
paginated `{items, meta}` shape — will break when exercised, needs a fix when Categories is wired.

**Verified live** via the same Playwright-driven browser approach as F0 (script removed after use), against
freshly-seeded real data (one low-stock product, one customer, one order): all four KPI cards showed correct
real values (`AED 62` revenue, `1` order with `1 pending` caption, `1` customer, `1` low-stock alert with
`0 out of stock`), both chart panels showed the "coming soon" placeholder, the Recent Orders table showed the
real seeded order, the Low Stock section showed the real seeded product with a working "Restock" link, and
zero console errors. (A text-content check for the literal string "undefined" initially flagged a false
positive — traced to Next.js's own internal RSC hydration `<script>` payload, not visible page content.)

### 8.3 Phase F2 — Categories

- **Pagination shape fix**: `/categories` on the real backend is paginated (`{items, meta}`); every consumer
  (`categories/page.tsx`, `reports/page.tsx`, `content/seo/page.tsx`, `products/page.tsx`,
  `ProductForm.tsx` — 5 call sites, not just the Categories page itself) expected a flat `Category[]`, per
  the mock. Fixed all five the same way: `useAdminQuery<PaginatedResponse<Category>>(..., { per_page: 100 })`
  + destructure `.items`, matching the "fetch everything in one call" convention the Reports page already
  used for orders/products. Fixing every consumer now (not just Categories') avoids rediscovering the same
  break mid-way through Products (F6) or SEO (F7).
- **Real bug found via browser testing, not code review**: editing a category silently did nothing — no
  network request, no visible error, the drawer just stayed open. Root cause: `is_active` comes back from
  MySQL (`TINYINT(1)`) through PDO as PHP `int` `1`/`0`, which `json_encode()`s as the **number** `1`/`0`,
  not a JSON boolean. The form's `z.boolean()` schema silently rejects a `1`, and `handleSubmit` never even
  calls its submit function on validation failure — no error surfaces because `is_active` has no
  `FormField error=` wired up. **Create worked** (masking this for a while) only because it starts from a
  real `true` default, never touching server data; **edit** resets the form from the actual API response and
  broke immediately. This is a systemic backend response-shape issue, not category-specific — every
  `TINYINT(1)` column, on every entity, has the same latent bug. Fixed at the root: new
  `App\Core\Arr::boolify()`/`boolifyMany()` helper (`backend/app/Core/Arr.php`), applied in
  `CategoryService::find()`/`list()` for `is_active`. **Flagged to apply the same fix to every other entity's
  Service as its frontend phase comes up** — `Brand`/`Page.is_published`/`Product.is_active,vat_inclusive,
  track_inventory,fits_all_vehicles`/`Review.is_approved`/`User.is_active,needs_password_change,
  two_factor_enabled` are all confirmed-affected candidates, not yet fixed.
- Also fixed `categorySchema.ts`: `description_en`/`description_ar` were `z.string().optional()` (allows
  `undefined`, not `null`) while the backend returns `null` for an unset optional column — same class of
  silent-validation-failure bug as the boolean one, just not the one actually triggered in this test run.
  `pageSchema.ts`/`productSchema.ts` have the identical `.optional()` pattern but were **not** touched here —
  both have deeper field-name mismatches (backend `status` enum vs frontend `is_active`, `brand_id` vs
  `brand_name`, no product/page-level SEO fields on the backend at all) that need full rework in their own
  phases (F6/F8) anyway; patching just the nullability now would be a partial fix touching the same file twice.

**Verified live**, full CRUD round-trip: create a top-level category, create a child under it via the parent
dropdown (hierarchy rendered correctly in `CategoryTree`), edit the child's name (the bug above, confirmed
fixed — `PUT` now returns 200 instead of never firing), the delete-confirmation dialog correctly warning
"1 subcategory(ies) will be left uncategorized" when attempting to delete a parent with a child still attached
(backed out via Escape rather than confirming — the backend's actual 409 rejection if a user pushes through
that warning anyway wasn't exercised in this pass, though it's the same guard already verified live back in
Phase 2/§7.4), then successful cascading delete of child then parent. Zero console errors throughout.

### 8.4 Phase F3 — Vehicles

The mock inventory (§8, "Vehicles: mock exposes 3 endpoints...") turned out to describe a feature the actual
page doesn't use. Reading the real component first (as the plan's per-phase discipline requires) showed
`vehicles/page.tsx` doesn't call `/vehicles/years`/`/makes`/`/models` at all — it fetches all vehicles in one
`GET /vehicles?per_page=500` call (already the correct paginated shape, already correctly destructured) and
groups them into Years/Makes/Models tabs **client-side**, the same "fetch everything, aggregate locally"
convention as the Reports page. No adapter needed there.

What the page *did* have: group-level bulk actions with no backend equivalent — "Edit Year"/"Edit Make"/
"Edit Model" (each called `PATCH /vehicles/bulk-rename`, renaming every matching row at once), a delete on
each group row (`POST /vehicles/bulk-delete` with a filter), and a full CSV bulk-import card
(`POST /vehicles/import`). The real backend only ever supported single-row `POST`/`PUT`/`DELETE
/vehicles/{id}` — bulk operations were never part of any backend phase. Per the approved plan decision, these
were removed rather than left half-wired to non-existent endpoints:

- `VehicleGroupDrawerForm.tsx` simplified from a 4-mode component (add/edit-year/edit-make/edit-model) down
  to add-only — the only mode with a real backend counterpart.
- `vehicles/page.tsx`: dropped the actions column (edit/delete) from all three tabs, dropped the bulk-delete
  mutation/confirm dialog, dropped the `<VehicleCsvImport />` card entirely.
- `VehicleCsvImport.tsx` deleted outright (zero remaining references) rather than left dead in the tree.
- The three tabs remain as a real, live-data **browse** view; "Add Vehicle" (single row) is the only write
  path — consistent with per-vehicle fitment assignment actually happening in the product form's
  `vehicle_ids` (Phase F6), not here.
- `Vehicle` has no boolean-shaped columns, so the `Arr::boolify()` treatment from §8.3 doesn't apply here —
  confirmed by reading the schema, not assumed.

**Verified live**: all three tabs (Years/Makes/Models) rendering real seeded data, no "Bulk Import" text
anywhere on the page, adding a new vehicle via the simplified drawer (`201`, appears immediately in the
Models tab), and submitting the exact same year/make/model again correctly returning `409` with the existing
"already exists" message. Zero unexpected console errors (the one logged entry is the browser's own
network-log line for the expected 409 response, not an application error).

### 8.5 Phase F4 — Media library

- **New backend endpoint**: `PUT /admin/media/{id}` (`MediaController::update`/`MediaService::update`) — the
  only editable field is alt text (`alt_text_en`/`alt_text_ar`); replacing the file itself is a new upload,
  not a metadata PUT, so it's intentionally not accepted here.
- **Field-shape adapter, not a component rewrite**: the real backend's media rows use different names/units
  throughout (`original_filename` vs mock `filename`, `size_bytes` vs `size_kb`, `mime_type` vs `mime`,
  `path` vs `url`, no `width`/`height`/`color` at all). Rather than rewriting `MediaCard`/`MediaDetailDrawer`,
  added one shared adapter — `src/lib/admin/mediaAdapter.ts`'s `toMediaItem()` — that translates a raw
  backend row into the existing `MediaItem` shape once, at the fetch boundary. Written to be reused by the
  product image picker in Phase F6, not just this page.
- **Real thumbnails, not fake swatches**: the mock had no binary file storage, so `MediaThumbnail` rendered
  every item as a colored icon swatch (`MediaItem.color`). The real backend actually stores real files, so
  this was a genuine, low-effort improvement worth making now rather than deferring: `MediaThumbnail` now
  renders an actual `<img>` for images (constructed from the backend origin + the row's `path`), falling back
  to the icon+swatch only for documents or if an image fails to load (`onError`).
- **Removed the "Replace" feature** from `MediaDetailDrawer` — the mock's version sent fake metadata
  (`filename`, `size_kb`, `uploaded_at`) via `PUT` with no actual new file content, which never had a real
  backend equivalent (a true replace-in-place would need a new multipart re-upload endpoint, which doesn't
  exist). Removed outright rather than left half-wired, consistent with the Vehicles-phase precedent. Bulk
  delete needed no changes — it already just fires one `DELETE` per selected id in parallel, which maps
  directly to the real single-row endpoint.

**Verified live**: uploaded a real PNG (`201`), confirmed the grid thumbnail *and* the detail-drawer preview
render the actual uploaded image (not a placeholder) with the URL correctly resolved to the backend origin,
updated alt text through the new `PUT` endpoint (`200`, values persisted), confirmed no "Replace" button
exists anywhere in the drawer, and deleted the item (`200`, removed from the list). Zero console errors.

### 8.6 Phase F5 — Brands (product-form-only)

No standalone Brands page, per the approved decision — just a real brand picker in the product form. Scoped
deliberately narrow: the rest of `ProductForm`'s submission payload (e.g. `cost` vs the backend's
`cost_price`, `seo_title_en`/`seo_description_en` fields that don't exist on `products` at all — SEO is the
separate `SeoMeta` entity) still doesn't match the real backend and is explicitly Phase F6's job, not
touched here.

- New `src/types/brand.ts` (`Brand` interface matching `BrandService`'s response) and a `brands.all` entry
  added to `adminQueryKeys` — neither existed before, since the original mock scaffolding never had a
  first-class Brand concept (`brand` was just a free-text string on Product).
- `productSchema.ts`: `brand_name: z.string().min(1, ...)` (required free text) replaced with
  `brand_id: z.coerce.number().int().positive().nullable()` (optional FK) — matching the real backend's
  `brand_id`, which actually is nullable (not every part has a well-known brand), unlike the mock's forced
  required field.
- `BasicInfoCard.tsx`: free-text Brand `<Input>` replaced with a `<Select>` populated from a real `brands`
  list, using the same explicit `setValue`/`watch` empty-string-to-`null` pattern already established for
  the category-parent picker in Phase F2 (`register()`'s native change handling can't produce `null`).
- `ProductForm.tsx`: fetches `/brands` for real, passes the list down, and `productToFormValues()` (used
  when editing) tolerates the mock `Product` type not having a `brand_id` field yet — a temporary, clearly
  commented gap that resolves itself once Phase F6 replaces the mock-shaped product fetch.

**Verified live**: navigated directly to `/admin/products/new` (bypassing the not-yet-wired products list
page, which isn't this phase's concern) — the Brand dropdown populated with the real seeded brands ("No
brand", "Bosch", "Denso") via a live `GET /admin/brands` call, and selecting "Bosch" set the underlying form
value to its real numeric id (`2`), not a text string — confirming the field now round-trips a proper FK
instead of free text.

### 8.7 Phase F6 — Products (the biggest phase yet)

The single largest integration pass — full list/create/edit/delete, images, specifications, vehicle
fitment, and the brand picker from Phase F5, all wired to the real backend. Reading the real files first
(the established per-phase discipline) surfaced real backend bugs before any frontend code was touched.

**Two real backend bugs fixed** (`ProductService.php`), both systemic response-shape issues like the
boolean bug found in Phase F2, not product-specific:
- **`images` returned as a JSON-encoded string, not an array.** `validate()` correctly `json_encode()`s the
  images array before storing (a MySQL JSON column), but nothing ever decoded it back on the way out — PDO
  never parses JSON columns automatically. Every response had been silently returning `"images": "[1,2]"` (a
  string) instead of `"images": [1,2]` (an array) since Phase 2, undetected until this phase's live testing
  actually inspected a real payload. Fixed with a `shape()` step in `find()`/`list()` that `json_decode()`s it.
- **`vat_inclusive`/`track_inventory`/`fits_all_vehicles`** — the same `TINYINT(1)`-returns-as-PHP-int bug
  from §8.3, now fixed here too via the same `Arr::boolify()` helper (extended to a 3-field list this time).
- **New filter**: `low_stock` (a computed condition — `track_inventory AND low_stock_threshold IS NOT NULL
  AND stock_quantity <= low_stock_threshold`, mirroring `DashboardService`'s own definition) added to
  `ProductController`/`ProductRepository`, since the frontend's stock filter dropdown has an option with no
  real column to match against (`stock_status` only covers `in_stock`/`out_of_stock`/`backorder`).

**Frontend rebuilt around a proper `Product` type** (`src/types/product.ts`) instead of continuing to
patch around the mock's shape with `as unknown as {...}` casts — brand_id (FK) not brand_name (free text),
cost_price not cost, real booleans, real images array, no product-level SEO fields.

- **`productSchema.ts`**: `cost` → `cost_price`; `description_en/ar` and `short_description_en/ar` changed
  from `.optional()` to `.nullable().optional()` (the exact same silent-validation-failure class of bug
  fixed for categories in §8.3, applied proactively here now that the real field contract was fully known,
  rather than waiting to rediscover it live); `seo_title_en/ar`/`seo_description_en/ar` removed entirely.
- **SEO fields removed from the product form** — the backend has no product-level SEO columns at all (SEO
  is the separate `SeoMeta` entity, `page_type='product'`). `SeoCard` now shows just the URL slug field
  (kept — that one's a real product column) with a "Generate from Name" button; the four SEO title/description
  inputs and the old "Fill from Name" logic that touched them were deleted, not disabled. Per-product SEO
  overrides belong on the general SEO management page (Phase F7) via `reference_id`, once that's connected.
- **Media adapter reused in two more places**: `ImagesCard`'s image picker and `MediaLibraryPickerModal`
  both independently fetch `/media` and needed the same `toMediaItem()` translation built in Phase F4 —
  confirming that adapter's design (shared, not page-specific) paid off exactly as intended.
- **Vehicle fitment and specifications needed zero backend-shape changes** — `VehicleCompatibilityCard`
  already fetched real vehicles and stored plain `vehicle_ids: number[]`; `SpecificationsCard`'s
  `key_en/key_ar/value_en/value_ar` shape already matched `product_specifications` exactly.
- **Products list page**: `sort`/`order` params renamed to `sort_by`/`sort_dir` (every other admin list
  endpoint's convention); the stock filter dropdown now maps to the real params correctly
  (`in_stock`/`out_of_stock` → `stock_status`, `low_stock` → the new `low_stock` flag); added a Brand column
  using the `brand_name_en` field the repository already joins in; `mediaById` now goes through the adapter
  like everywhere else.
- **"Duplicate" removed** (no backend endpoint, consistent with the approved decision) — **but "bulk
  activate/deactivate/delete" was upgraded rather than removed**: instead of the mock's single fictional
  `POST /products/bulk` call, it now fans out to the real single-row `PUT`/`DELETE /products/{id}` endpoint
  in parallel per selected id — the exact same working pattern Media's bulk delete already used in Phase F4.
  This is a genuine, fully-functional implementation, not a half-wire, so it was kept rather than hidden.

**Verified live**, a complete round-trip with real seeded category/brand/vehicle data: created a product
with an uploaded image, a bilingual specification, and vehicle fitment in one request — the response
confirmed `images: [6]` (a real array), `vat_inclusive: true` (a real boolean), `vehicle_ids: [9]`,
`specifications` with all four bilingual fields, and `brand_id: 4`, all correctly persisted. The list page
showed the new product with correct thumbnail, category, and brand columns. Opening it for edit correctly
pre-filled every field, including the specification's `key_en` input value and the fitment chip — confirmed
via actual input values, not just visible text (a `.textContent()`-based check can't see input values, which
produced one false-negative during testing before being corrected). Delete removed it cleanly. Zero console
errors across the entire flow.

**Not yet built**: bulk row-level UI actions beyond activate/deactivate/delete (matches what the list page
already exposes); product-level SEO management (deferred to Phase F7's general SEO page).

### 8.8 Phase F7 — Settings & SEO

Reading the real admin pages against the real backend surfaced the widest gap yet between what the mock had
built and what Phase 3 actually shipped: both `Settings` and `SeoMeta` on the real backend are deliberately
much smaller entities than their mock counterparts, so this phase was mostly about *shrinking* the frontend
to match reality rather than adapting shapes.

**Real backend bug fixed** (`PageService.php`) — same `TINYINT(1)`-returns-as-PHP-int class of bug as
§8.3/§8.7: `is_published` had no `Arr::boolify()` applied in `find()`/`list()`. Fixed the same way, ahead of
any live testing this time since the pattern was already well understood.

**Settings — rebuilt around a flat, unlabeled key/value list, not a rich CMS model.** The mock's `Setting`
had 6 value types (including `select`, `textarea`, `media`, plus a special-cased `legal_`-prefixed
page-picker) and a fixed 9-tab layout sized for dozens of settings. The real `settings` table has just 3
value types (`string`/`number`/`boolean` — `json` exists in the enum but nothing seeds it yet) and no
label/helper-text/group-display columns at all — only `key`, `value`, `type`, `group_name`.
- `SettingField.tsx` rewritten down to the real 3-type union; the `select`/`textarea`/`media` branches and
  the legal-page-picker special case were deleted outright (no real setting needs them), not stubbed.
- New client-side metadata catalog (`src/types/setting.ts`: `SETTING_LABELS`, `GROUP_LABELS`) supplies
  display labels/helper text the backend doesn't store, keyed by the real `key`/`group_name` values —
  chosen over adding label columns to the backend, since these are presentation-only concerns. Covers all
  7 currently-seeded settings.
- Settings page rewritten so **tabs are derived from whatever `group_name` values are actually present**
  in the real data (currently `general`/`tax`/`integrations`/`payments`) instead of a hardcoded 9-tab list —
  most of which would have rendered permanently empty against the real seed.
- Save mutation fixed to send the real body shape `PUT /settings/bulk` expects:
  `{ settings: { key: value, ... } }`, a keyed object per `SettingController::bulkUpdate()`, not the mock's
  array-of-pairs assumption.
- `GET /settings` confirmed to be the **one list endpoint in the whole admin API that isn't
  `{items, meta}`-paginated** — `SettingService::list()` returns `repo->allGrouped()` as a flat array
  directly. Worth flagging since every other list page in this project follows the paginated convention;
  an easy trap for future phases to fall into.

**SEO — real backend has no single "settings for a page" endpoint, so the drawer now does a real
create-vs-update upsert.** The mock's `PUT /seo` implied one row per path, always updatable in place. The
real backend only creates a `SeoMeta` row once someone customizes a route (`POST /seo`) and only has
`PUT /seo/{id}` for rows that already exist — there is no upsert-by-path endpoint.
- `seo-rows.ts` renamed every field to match the real `SeoMeta` shape (`meta_title_en/ar`,
  `meta_description_en/ar`, `og_image` as a plain URL string instead of `og_image_media_id`). Also fixed the
  computed defaults for un-customized routes: products and pages have **no** `seo_title_en`/`seo_description_en`
  columns on the real backend at all (SEO has always been the fully separate `SeoMeta` entity, confirmed
  again here) — defaults are now computed (`${name_en} | Auto Parts UAE`) rather than read off a
  nonexistent field, matching the pattern categories already used.
- `SeoDrawerForm.tsx` now branches on `row.overrideId`: `POST /seo` when a route has never been customized,
  `PUT /seo/{id}` once it has. `og_image` changed from a media-ID lookup to a plain URL string — the media
  picker still opens the same `MediaLibraryPickerModal`, but resolves the picked item to its `url` before
  storing, and the existing value renders by matching `url` back to a `MediaItem` for the thumbnail preview
  rather than the reverse.
- SEO page's `pagesQuery`/`seoQuery` fixed to expect real `{items, meta}` pagination (both were still typed
  as flat arrays, the same bug class already fixed for categories/products in earlier phases — caught this
  time from reading the Controller before wiring, not from a live failure).

**Verified live**: logged in, edited `site_name` on the General tab, saved, reloaded the page, confirmed the
new value persisted from the database (not just local state) and the Tax & VAT tab showed the real seeded
`vat_rate` (5.00). On the SEO Manager, confirmed the Homepage row and all 3 real seeded pages
(`terms-and-conditions`, `refund-policy`, `privacy-policy`) list correctly with computed default titles.
Opened the Terms & Conditions row (no existing override — `overrideId` undefined), set a custom title,
saved — confirmed the `POST /seo` create path fired, the new title appeared in the table, and reopening the
same row now pre-filled from the newly-created override. Edited it again and saved — confirmed this second
save went through `PUT /seo/{id}` and the table reflected the update. Zero console errors throughout. Test
override cleaned up from `seo_meta` afterward; `site_name` restored to its original value.

**Not yet built**: `type: "json"` settings (backend enum supports it, nothing seeds it yet — `SettingField`
would need a 4th branch when one exists); bulk SEO operations (none exist on the mock either).

### 8.9 Phase F8 — Pages (CMS)

Same shrink-to-fit pattern as Settings/SEO in §8.8: the mock's `Page` had a 3-state `status`
(`draft`/`published`) *and* a separate `visibility` (`public`/`private`) enum, plus 4 page-level SEO fields.
The real `pages` table (confirmed via `PageController`/`PageService`) has none of that — just `title_en/ar`,
`slug`, `content_en/ar`, and a single boolean `is_published`. No visibility concept exists at all, and SEO
for a page has always been the separate `SeoMeta` entity (`page_type: 'page'`, wired in §8.8) — never a
page-table column, consistent with what Products (§8.7) and now this phase both independently confirmed.

- `pageSchema.ts`: dropped `status`/`visibility`/`seo_title_en/ar`/`seo_description_en/ar` entirely; replaced
  with a single `is_published: boolean`. `content_en`/`content_ar` changed to `.nullable().optional()` (the
  same silent-validation-failure class fixed proactively elsewhere once the real nullable-column contract is
  known, rather than waiting to rediscover it live).
- `PageForm.tsx`: removed the Visibility and SEO cards outright. The two-button "Save as Draft"/"Publish"
  intent pattern from Products (§8.7) was considered but rejected here — Product's `status` genuinely has a
  third state (`draft`/`active`/`inactive`) that a bottom-button intent explains cleanly, but a Page's
  `is_published` is strictly binary, so following Category's convention instead (§8.3: one `Switch` bound
  directly to the boolean, one `Save` button) is the more honest fit — no redundant "the button might
  silently override what the switch shows" ambiguity. The switch label flips between "Published"/"Draft" as
  it's toggled, mirroring `CategoryDrawerForm`'s `is_active` switch exactly.
- List page: fixed `pagesQuery` to the real `{items, meta}` pagination (was still typed as a flat array — the
  same recurring bug class as §8.7/§8.8, caught this time from reading `PageController::index()` first, not
  from a live failure); `status` column replaced with an `is_published`-driven `StatusBadge` (reusing the
  same component, mapping the boolean to its existing `"published"`/`"draft"` string keys rather than adding
  new badge variants).
- Edit page: `Page` type import switched from the mock to the real `@/types/page` shape (already built in
  §8.8 for the SEO page's `pagesQuery`, now finally consumed by the module it was actually named for).

**Verified live**: listed all 3 real seeded pages (Terms & Conditions, Refund Policy, Privacy Policy).
Created a new page ("About Us Test") — confirmed the slug auto-derived from the English title on blur, the
create POST succeeded, and the new row appeared with a "Draft" badge (`is_published` correctly defaulted
`false`, not silently coerced by the old `TINYINT(1)` bug since `PageService`'s `Arr::boolify()` fix from
§8.8 already covered `is_published`). Reopened it for edit, confirmed the title pre-filled correctly, toggled
the Switch, saved — the badge flipped to "Published" and the update persisted. Deleted it — removed cleanly
from the list. Zero console errors throughout. Test page removed from `pages` afterward.

**Not yet built**: page visibility/access control (no backend concept — every page is effectively public by
slug); rich-text editor content is stored as raw HTML in `content_en`/`content_ar` with no sanitization step
surfaced in the admin UI (backend stores whatever string is sent — worth a follow-up security pass if this
editor is ever exposed to non-admin roles, though it currently is not).
