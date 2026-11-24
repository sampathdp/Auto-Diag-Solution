# Existing System Audit

Audit of the codebase at commit `41fb90e` (branch `master`), done before any B2B work. Findings come from source code, migrations and routes, not from the README-style docs. `ARCHITECTURE.md` and `ADMIN_ARCHITECTURE.md` are partly out of date: they describe a Vite SPA and an MSW mock admin, but the code is now Next.js and talks to the real PHP API.

## 1. Stack

| Layer | Actual implementation |
|---|---|
| Frontend | Next.js 15 (App Router), React 18, TypeScript, Tailwind, next-intl (en/ar), TanStack Query 5, Zustand 4, react-hook-form + zod, @tanstack/react-table |
| Backend | Hand-rolled PHP 8.3 micro-framework: `App\Core\Router`, `Request`/`Response`, Controller → Service → Repository over raw PDO (`DatabaseManager`, `QueryBuilder`) |
| Database | MySQL / InnoDB, utf8mb4. Migrations are PHP classes running raw SQL, run by `php backend/console.php migrate` / `migrate:rollback` |
| Auth | Custom HS256 JWT (`SimpleJWT`, `JWTService`), refresh tokens table, TOTP 2FA, Google/Facebook OAuth, guest users (`users.is_guest`) |
| Jobs | No queue. CLI commands in `backend/console.php`, run by cPanel cron (example: `fulfillor:sync`) |
| Email | `SimpleSmtpMailer` (raw SMTP, synchronous), `OrderMailService` (order confirmation HTML) |
| SMS | **None.** No SMS provider or abstraction exists |
| Payments | **Mock only.** `CheckoutService::createOrder` hardcodes `payment_method='mock'`, `payment_status='paid'` and a `MOCK-…` reference. No real gateway, no COD, no bank transfer |
| 3PL | Fulfillor integration (`Services/Fulfillment`, webhook, cron sync) |
| Tests | Playwright API/security specs in `e2e/tests/security/*`. No PHPUnit, no frontend unit tests |
| Deploy | GitHub Actions build, then FTP to shared hosting (per `ARCHITECTURE.md`) |

## 2. Authentication and authorization

- `users.role` is `ENUM('admin','customer')`. There is no dealer role and no staff sub-role.
- `JWTService::getUserPermissions()` is a placeholder: admin gets `['*']`, everyone else gets `[]`.
- `PermissionMiddleware` exists, but **admins bypass every permission check**. `RoleMiddleware` guards the whole `/api/v1/admin/*` group.
- Result: every admin has full financial power today. Part 12 of the brief (restricted financial permissions) needs a real permission model. See the Integration Architecture, §6.
- There is no email verification flow (only password reset tokens).
- `RateLimiter` service plus a `rate_limits` table exist and are used by `AuthController`.

## 3. Catalog and pricing

- `products` holds one price: `price DECIMAL(10,2)`, plus `compare_at_price`, `cost_price`, `vat_inclusive`, `free_shipping`, stock fields and `status ENUM('draft','active','inactive')`.
- No variants table. Brands and categories are FK tables. Fitments and cross-references are separate tables.
- The public catalog `GET /api/v1/products[/{id}]` is unauthenticated and is consumed by Next.js storefront pages, which may be server-rendered and cached. **Wholesale prices must never appear in these responses.**

## 4. Cart and checkout (retail flow traced)

1. **Register / login:** `AuthController::register|login`. Cookie/JWT go into the `useAuthStore` Zustand store.
2. **Browse:** public product endpoints, `ShopView` and `ProductCard`.
3. **Cart:** **client-side only.** `useCartStore` is a Zustand store persisted to localStorage. The `carts`/`cart_items` tables exist, but only `AccountOrderService` (reorder) and `ProductService` touch them. No cart API exists.
4. **Checkout:** `POST /api/v1/account/checkout` or `/checkout/guest` call `CheckoutService::placeOrder|placeGuestOrder`, then `createOrder`.
   - `resolveLineItems()` re-reads each product, checks status and stock, and takes `unit_price = products.price`. The frontend price is already ignored, which is good.
   - VAT is 5%, with per-line `vat_inclusive` handling. Shipping comes from `ShippingService` by district. The promo code is re-validated server-side.
   - One transaction: insert the order, then the promo usage guard, the commission, the `order_items` snapshot, an atomic `decrementStock`, a `payment_transactions` row and a status history row.
   - Order status starts as `pending_vin_verification`. An admin verifies the VIN, then calls `approveForFulfillment`, which sends the order to Fulfillor.
5. **Payment:** mock, auto-marked as paid.
6. **Admin processing:** `OrderController` and `OrderService` (status, payment status, notes, VIN, fulfillment, refund).
7. **Notification:** `sendConfirmationEmail`, sent synchronously after commit.

Retail-specific logic lives in `CheckoutService::resolveLineItems` (price source) and `createOrder` (payment fields). Both are the main extension points.

## 5. Orders and payments

- `orders`: `status` ENUM (pending, pending_vin_verification, paid, processing, shipped, delivered, cancelled, refunded); `payment_status` ENUM (pending, paid, failed, refunded); `payment_method VARCHAR(50)`; money as `DECIMAL(10,2)`; `currency VARCHAR(3) DEFAULT 'AED'`; `shipping_snapshot JSON`; promo and commission columns; Fulfillor columns; VIN columns; `tracking_token_hash`.
- `order_items`: sku/name/`unit_price`/`line_total` are snapshotted. Historical prices are already preserved.
- `payment_transactions`: one row per provider event, with `UNIQUE(provider, provider_reference)`, which is the existing idempotency hook.
- `order_status_history`, `admin_notes` and `admin_activity_logs` give audit trails that can be reused.

## 6. Files and documents

- `FileUploader::upload()` validates MIME with `finfo` (jpg/png/webp/gif/pdf), uses random file names and converts images to WebP. **It writes to `backend/public/uploads/<subDir>`, which is inside the web root.**
- `StorageController::serve` requires a JWT for `payment-proofs`, `payment-slips`, `documents` and `invoices`. But:
  - the files are also reachable directly at `/uploads/documents/<file>` through the web server, which bypasses the controller;
  - the controller only checks that *some* valid JWT exists. It does not check ownership, so this is an IDOR.
- Conclusion: the current private-file mechanism is **not fit for Emirates ID / Trade Licence documents**. A new private store outside `public/` is required.

## 7. Admin dashboard

- `frontend/src/app/admin/(protected)/*` pages inside `AdminShell`. Navigation is defined in `components/admin/layout/nav-items.ts` and supports groups (Content, Marketing).
- Reusable pieces: `DataTable`, `FilterBar`, `NotesPanel`, `StatusTimeline`, `ActionsMenu`, `StatCard`, `StatusBadge`, `lib/admin/api-client.ts`, `query-keys.ts`.
- Settings: key/value `settings` table (`type` string/number/boolean/json, `group_name`), with admin CRUD and bulk update.

## 8. Customer account area

- `/[locale]/account/*`: overview, orders, vehicles, wishlist, profile, addresses, notifications. The side nav is defined in `account/layout.tsx`. `/dashboard` redirects to `/account/overview`.
- `SiteHeader` nav: Home, Shop, About, Contact, labelled through `useTranslations("nav")`.

## 9. Localisation and market mismatch (needs decision)

The brief targets **Sri Lanka**: LKR, NIC, districts, cheques. The code targets **UAE**: `currency DEFAULT 'AED'`, the `settings.currency = AED` seed, `formatAED`, 5% VAT, Arabic product names and `customer_addresses.emirate ENUM(...)`. **Resolved 2026-11-22: UAE.** Brief terms are mapped to UAE equivalents (Integration Architecture §0).

Also confirmed: current real-world payments are Cash on Delivery and Bank Transfer. The card gateway is on hold ("Coming soon" in checkout). There is no SMS.

## 10. Reuse vs extend summary

| Component | Decision |
|---|---|
| `users`, auth, JWT, refresh, 2FA | Reuse. A dealer is a `customer` user plus a `dealer_profiles` row |
| `products` | Extend with wholesale columns |
| `CheckoutService` | Extend: inject `PricingService` and `PaymentMethodPolicy`; add a channel |
| `orders`, `order_items`, `payment_transactions`, `order_status_history` | Extend (channel, dealer, quotation link, pricing type) |
| Admin shell, DataTable, settings | Reuse. Add a B2B nav group |
| Account area | Reuse. Add dealer-only sections (no separate dealer dashboard) |
| `FileUploader` | Reuse the validation logic, with a new private target directory |
| `StorageController` | Leave for public assets. New authenticated document endpoint with ownership checks |
| `SimpleSmtpMailer` | Reuse behind a new notification outbox plus cron dispatcher |
| `admin_activity_logs`, `admin_notes` | Reuse for B2B audit and notes |
| `RateLimiter` | Reuse on registration, upload and payment endpoints |
