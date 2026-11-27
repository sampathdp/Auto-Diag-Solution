# B2B Implementation Plan

Phased so that every phase ships independently and leaves retail working. Each phase ends with its tests green, including the retail regression suite. Architecture references point to `INTEGRATION_ARCHITECTURE.md`.

**Scope note:** no separate dealer or B2B dashboards. Dealer UI extends `/account/*`, and admin UI extends the existing admin shell with a B2B nav group (Architecture §10).

## Phase 0: Decisions and foundations

Decisions confirmed 2026-11-22 (see Risk Register):
- Market is UAE: AED and 5% VAT, with Trade Licence, TRN and Emirates ID in place of BR, TIN and NIC.
- The card gateway is on hold and stays "Coming soon" in checkout.
- Notifications are email only (no SMS).
- The credit period starts on delivery.
- Wholesale price is mandatory.
- Live payments are COD and Bank Transfer only.

There are no remaining blockers.

1. **Permission model.** Migration: `users.is_super_admin` (backfill existing admins to 1) and the `user_permissions` table. Update `JWTService::getUserPermissions`, change `PermissionMiddleware` so only super admins bypass, and add `PermissionService::userHas()` (DB check). Add an admin UI to assign permissions.
2. **Private storage.** `PrivateDocumentStorage` writing to `backend/storage/private` (outside the web root) plus an `.htaccess` deny rule. Update the deploy workflow to create the folder and exclude it from FTP overwrite.
3. **Notification outbox (email only).** `notification_outbox` migration, `NotificationOutbox`, the `notifications:dispatch` console command (through `SimpleSmtpMailer`), a shared HTML email layout, and the cron entry documented.
4. **Settings.** `b2b_*`, `payment_*` and `retail_payment_methods` keys, created automatically by `SettingService` on first use (no seeder run needed), plus a B2B Dealers tab in the admin settings page.
5. **Test harness.** `e2e/tests/b2b/` folder, plus helpers to create a dealer in each status through the API or seed.

**Status (2026-11-22): built, not yet run against a database.**
- Done: migrations `2026_11_22_000001–000003`; `App\Support\Permissions`; `PermissionService` (DB-checked, with a fallback until migrations run); `PermissionMiddleware` (super admins only bypass); staff endpoints (`/admin/permissions`, `/admin/users/{id}/permissions`) and the `/admin/staff` page; `App\Core\PrivateStorage` plus folder guards and deploy-workflow rules; `StorageController` no longer serves sensitive types; `EmailOutbox`, with all three existing emails moved onto it, the `notifications:dispatch` command and the `/admin/email-log` page; restricted payment and B2B settings (keys are snake_case, `payment_*` / `b2b_*`, auto-created) with a B2B Dealers tab; `staff:make-super-admin` command; `e2e/tests/b2b/00-foundations.spec.ts`; corrected `ARCHITECTURE.md`, `ADMIN_ARCHITECTURE.md` and `SECURITY.md`.
- Left for later phases: dealer-specific helpers in the test harness (Phase 1, when dealer tables exist).

## Phase 1: Dealer registration and admin review

Backend:
- Migrations: `dealer_profiles`, `dealer_status_history`, `dealer_documents`, `dealer_profile_change_requests`.
- UAE application fields: trade licence number, expiry and copy; TRN and TRN certificate (optional when not VAT-registered); Emirates ID number with front/back images, or a UAE driving licence with front/back; emirate, city, area, optional P.O. Box; map URL and lat/lng.
- `DealerApplicationService`: save draft, upload docs, submit (validates all required fields and docs; checks the Emirates ID `784-…` format, a 15-digit TRN, and that the trade licence has not expired), resubmit when allowed. State machine guarded server-side, with every transition written to history.
- `DealerAdminService`: list/search/filter, detail, request info (to `draft` plus a message), mark under review, approve (unique dealer code, wholesale flag, credit config, activation/expiry, which creates the `dealer_credit_accounts` row), reject (reason, allow_resubmission), suspend/reactivate. Every action goes to `admin_activity_logs` and the outbox.
- Endpoints: `GET /partner/info` (public: registration enabled + terms), `GET|PUT /account/dealer/application`, `POST /account/dealer/application/documents`, `POST /account/dealer/application/submit`, `GET /account/dealer/status`, `GET /account/dealer/documents/{id}`; admin under `/admin/b2b/applications*`, `/admin/b2b/dealers*`, `/admin/b2b/documents/{id}`.
- Rate limits on submit and upload. `AccountController::me` gains a `dealer: {status, dealer_code}` summary (no sensitive fields).

Frontend:
- Header nav item (en/ar), `/partner`, `/partner/apply` (multi-step, zod), and the status card.
- Admin Dealer Applications list/detail, the secure document viewer (blob fetch), the approve/reject/suspend modals, and the Dealers list.

**Status (2026-11-23): built and tested.**
- Migrations `2026_11_23_000001–000005`: dealer profiles, status history, documents, credit accounts, and `admin_notes` accepting `dealer`.
- The owner's ID number is encrypted at rest (`App\Core\Encryption`), and only admins with `b2b.documents.view` see it in full.
- Login, register and social sign-in now support `?next=` (same-site paths only), so "Sign in to apply" returns to the form.
- The admin list and detail pages share one route, `/admin/b2b/dealers/{id}`.
- Tested on a throwaway database built from all 72 migrations. My new migrations roll back and re-apply cleanly. A 72-check end-to-end API run passed: draft, validation, uploads (a disguised PHP file is rejected), document privacy (other customer 404, anonymous 401, no storage paths in responses), submit, permission checks (customer and limited staff get 403), review, approve with credit, double-approve 409, suspend/reactivate, credit edit, notes, history, info request and resubmit, final rejection, admins can't apply, and all 7 dealer emails queued. Every new page compiles and renders in Next.js, in English and Arabic.
- Not done in this phase: dealer helpers in the e2e harness, and profile change requests (Phase 6).

## Phase 2: Wholesale pricing engine

- Migration step 1: `products.wholesale_price` (NULL for now) and `wholesale_min_qty`.
- `ProductService::validate`: `wholesale_price` is **required**, > 0, and ≤ `price`, on create and on every update. Existing products therefore can't be saved until it's filled in. That is intentional and drives the backfill. Writing the field needs `b2b.pricing.manage` (super admins have it). `ProductSeeder` is updated with wholesale values.
- Backfill tooling: a "Missing wholesale price" filter and badge on the admin products list, plus a CSV export/import of `sku, wholesale_price`. Until the backfill is done, a legacy product without a value sells to dealers at retail price.
- Migration step 2 (run once the backfill is complete): `MODIFY wholesale_price DECIMAL(10,2) NOT NULL`. The migration aborts if any NULL rows remain.
- `DealerContext` and `PricingService` (batch). `DealerPricingController`: `POST /dealer/pricing`.
- The admin product form gets a required Wholesale section, and the admin product list a wholesale column. Fulfillor sync payloads are unchanged.
- Confirm the public product endpoints and SEO JSON-LD never serialise `wholesale_*`. Add an explicit column allowlist in `publicFind` / `publicIndex` and an e2e assertion.
- Storefront: `useDealerPricing` hook, plus a price display component used by `ProductCard`, `ProductListRow`, `ProductDetailView`, `QuickViewModal`, cart and checkout.

**Status (2026-11-23): step 1 built and tested; step 2 and cart/checkout wait.**
- Migration `2026_11_23_000006`: `products.wholesale_price`, `wholesale_min_qty`, index.
- `ProductService::applyWholesale`: required, > 0, ≤ retail, min qty ≥ 1. Only `b2b.pricing.manage` may write it; anyone else's submitted value is ignored. An admin save of a product with no wholesale price is refused (422, or 403 without the permission), except a status-only change to draft/inactive, so a product can always be taken off sale. System callers (seeder, Fulfillor sync) are not blocked.
- `PricingService` (`catalogPrices`, `priceLines`, `unitPrice`) and `POST /account/dealer/pricing` (approved dealers with wholesale access only, at most 100 ids, active products only).
- Admin: Wholesale column, "Missing wholesale price" filter chip with count (`meta.missing_wholesale_count`), Wholesale section on the product form (read-only without the permission), and the CSV export/import (`/admin/products/wholesale/export|import`, all-or-nothing, dry run first, blank cells left alone).
- Storefront: `useDealerPrice` (batches every product on screen into one request) and `DealerPriceLine` on the card, list row, quick view and product page, in English and Arabic.
- Public product endpoints already use an explicit field list (`shapePublic`); tested that no `wholesale` key appears, also when a dealer is signed in.
- Tested on a throwaway database: 61 API checks and 20 browser checks passed.
- **Not done yet:** cart and checkout still show and charge retail. They move to `PricingService` in Phase 3, together with `channel='b2b'`, so dealers never see a price at checkout that isn't charged. Ship Phase 2 and Phase 3 together. Migration step 2 (NOT NULL) is written once the backfill is complete everywhere.

## Phase 3: Checkout refactor and payment methods (retail-sensitive)

- Migrations: `orders.channel`, `dealer_profile_id`, `quotation_id`, `payment_terms`; the `payment_status` ENUM extension; `order_items.pricing_type`, `retail_unit_price`.
- Extract `OrderPlacementService` from `CheckoutService::createOrder` **without behaviour change**. Run the retail regression tests before continuing.
- `PaymentMethodPolicy` and `GET /account/checkout/payment-methods` (plus a guest variant). Checkout accepts `payment_method`. **Retail: `cod` and `bank_transfer`. B2B: `cod`, `bank_transfer`, `cheque`, `credit`.** `online_card` is returned as `{available:false, label:"Coming soon"}` and rejected by the server if submitted. `mock` only when not in production (e2e).
- Checkout UI: the existing payment section is replaced with method tiles. The card tile keeps its "Coming soon" state. Choosing bank transfer shows the company bank details (IBAN etc. from settings) and the order number as the reference, plus an optional proof upload (also possible later from the order page).
- Order creation writes the real `payment_method` and `payment_status` (`pending` for COD, `pending_verification` for bank transfer) instead of mock `paid`. The status history note changes to match. The VIN hold and Fulfillor flow are unchanged.
- Admin order page: "Mark COD collected" and "Verify bank transfer" (view proof, then confirm), both writing `payment_transactions`. Proof files are kept in private storage.
- Admin Orders page: channel filter, dealer column, payment-method and payment-status badges.
- Order confirmation email: payment instructions for each method (bank details for transfers).
- **Online card gateway: on hold.** Only the `PaymentGateway` interface seam is built (no provider). Integrate when the client decides.

**Status (2026-11-27): built and tested, together with the Phase 2 cart and checkout pricing.**
- Migrations `2026_11_26_000001` (orders `channel`, `dealer_profile_id`, `quotation_id` UNIQUE, `payment_terms`, `payment_status` ENUM extension; order_items `pricing_type`, `retail_unit_price`) and `000002` (`order_payment_proofs`). Both roll back and re-apply cleanly. The `quotation_id` FK is added in Phase 4 with its table.
- `OrderPlacementService` holds the order-writing transaction (order, promo usage and commission, items, guarded stock, optional transaction, first history row). `CheckoutService` prices every line through `PricingService` and checks the method with `PaymentMethodPolicy`.
- Channel is decided on the server: B2B only for the signed-in user's own active dealer profile. Guest checkout is always retail, even with a dealer's email.
- `PaymentMethodPolicy`: retail = `cod`, `bank_transfer`; B2B = those plus `cheque`. `credit` is listed but refused until Phase 5 (no credit limit enforcement before `CreditService`). `online_card` is always "Coming soon" and refused. `mock` only outside production. Bank transfer is refused if no bank account is set in settings.
- New orders start unpaid: COD `pending`, bank transfer `pending_verification` (reference = order number), cheque `pending`. No transaction is written at checkout.
- A promo code can't be combined with a wholesale-priced line (422). Retail lines in a dealer's cart can still take one.
- Bank transfer receipts: `POST /account/orders/{id}/payment-proof` and `POST /orders/track/{orderNumber}/payment-proof?token=` (guests, rate-limited), private storage, at most 5 per order.
- Admin: `POST /admin/orders/{id}/confirm-payment` ("Mark COD collected", "Verify bank transfer" with the bank reference, "Mark cheque cleared" with the cheque number). It locks the order row and writes exactly one `payment_transactions` row; a reused bank reference gets a 409. New permission `payments.confirm` also guards the receipt viewer and the existing payment-status endpoint. A bank transfer order can't be sent to the 3PL until it is verified.
- Admin Orders list: channel, payment method and payment status filters, dealer badge and code, method under the payment badge, search by dealer code or name. Order page: dealer link, wholesale/retail per line, Payment card with receipts and transactions.
- Storefront: cart and checkout show and total the dealer price (with "add N more" below the minimum quantity), method tiles with bank details, payment panel with receipt upload on the success, account order and tracking pages. The fake "VISA •••• 4242" card on the account order page is gone. Confirmation email carries per-method payment instructions.
- Tested on a throwaway database: 101 API checks (retail regression, dealer pricing and methods, suspended and pending dealers, receipts, admin permissions, double and parallel confirmation, filters) and 28 browser checks (retail, dealer in English and Arabic, guest, admin with and without the permission).
- The first-order quotation requirement is enforced in Phase 4 (below), so Phase 3 and Phase 4 ship together. Cheque details beyond the number, credit orders and dealer payment records arrive in Phase 5.

## Phase 4: Quotations

- Migrations: `dealer_quotations`, `_items`, `_versions`, `_messages`, and the `orders.quotation_id` FK.
- `QuotationService`: create from dealer checkout when `needsQuotation`; admin revise (snapshot first, then edit lines, discount, shipping, expiry); messages (internal/dealer); approve/reject; dealer accept/reject; `convert()` transaction (Architecture §4); `b2b:expire-quotations` cron.
- Dealer endpoints: `/account/dealer/quotations` (list, detail, versions, messages, accept, reject, print data). Admin endpoints: `/admin/b2b/quotations*`.
- Emails: submitted (dealer + `b2b_sales_team_emails`), revised, approved, rejected, expiring, converted.
- UI: account Quotations pages with a print stylesheet ("Download PDF" uses browser print-to-PDF, so no new dependency; revisit if server PDFs are required). Admin quotation list and editor.
- Admin flag `force_quotation` on the dealer detail page.

**Status (2026-11-27): built and tested.**
- Migration `2026_11_27_000001`: `dealer_quotations`, `_items`, `_versions`, `_messages`, and the `orders.quotation_id` FK. Rolls back and re-applies cleanly.
- Checkout decides on the server: an active dealer with `requires_quotation` and no `first_order_completed_at`, or with `force_quotation`, gets a quotation instead of an order (`POST /account/checkout` returns `{kind:'quotation', quotation}`). The cart is priced exactly as checkout prices it (shared `App\Services\OrderTotals`); nothing is charged or taken from stock. Promo codes are refused on a quotation. `GET /account/checkout/payment-methods` and `GET /account/dealer` say `quotation_required` / `needs_quotation`. At most 10 quotations in progress per dealer.
- `QuotationService`: every change locks the quotation row. Versions: v1 is frozen at submission and each revision writes a new snapshot, so no version is overwritten. Admin revise edits quantities, unit prices, lines (product search), shipping, discount and expiry, and needs a reason the dealer sees; revising an approved quotation takes the approval back. Approve sets the expiry (default `b2b_quotation_expiry_days`). Messages are dealer-visible or internal (never sent to the dealer); "ask the dealer to reply" sets `discussion_required`, and the dealer's reply sets it back to `under_review`.
- Dealer: accept (choose the payment method; credit still refused until Phase 5), decline an offer (`rejected`) or withdraw a request (`cancelled`), messages. Accept converts inside the same transaction through `OrderPlacementService::write()`: `channel='b2b'`, `quotation_id`, `pricing_type='quoted'`, quoted totals, guarded stock decrement, then `first_order_completed_at`. A repeated or parallel accept returns the same order. Not enough stock at accept is a 409 and the quotation stays approved. A suspended or expired dealer can view but not accept.
- Expiry: `php console.php b2b:expire-quotations` (hourly) expires approved quotations past `expires_at` and sends one reminder 48 hours before; expiry is also applied on read and accept.
- Emails: submitted (dealer and `b2b_sales_team_emails`), revised, approved, rejected, message to dealer, dealer reply, declined/withdrawn, expiring, converted; the order confirmation is the usual one.
- Permissions: `b2b.quotations.manage` (view, start review, revise, message), `b2b.quotations.approve` (approve, reject). The dealer's quotation rule (`PUT /admin/b2b/dealers/{id}/quotation-rule`) needs `b2b.applications.review`.
- UI: account Quotations list and detail (status, lines, totals, versions, messages, accept with payment tiles and bank details, decline, print to PDF), in English and Arabic; checkout notice and "Send quotation request" button. Admin Quotations list (status tabs, search, dealer filter) and editor; Quotations card on the dealer page with the "always require a quotation" switch; "From quotation" link on the admin order page.
- Tested on a throwaway database: 92 API checks (who needs a quotation, pricing and totals, isolation between dealers, permissions, messages and internal notes, revise validation and versions, approve, accept, idempotent repeat accept, stock, expiry lazy and by cron, reminders once, suspended dealer, force flag, filters, open-quotation cap) plus a race test (8 parallel accepts: one order, stock taken once), and browser checks of the dealer and admin flows in English and Arabic.
- Not done here: dealer-facing "quote only" products (the schema allows adding the flag later), server-generated PDFs (browser print is used), and a company TRN setting for the printed quotation (`company_trn` is read if present).

## Phase 5: Credit, invoices, dealer payments

- Migrations: `dealer_credit_accounts` (if not done in Phase 1), `dealer_credit_ledger`, `dealer_invoices`, `dealer_payments`, `dealer_payment_allocations`, `dealer_payment_events`.
- `CreditService`: `lockAccount` (`SELECT ... FOR UPDATE`), `available = limit − outstanding − reserved`, `reserve` on credit order or conversion, `release` on cancel, and `postInvoice` (move reserved to outstanding, ledger `invoice`). Ledger rows are insert-only. Every balance change happens in the same transaction as its ledger row.
- `InvoiceService`: hook into `OrderService::updateStatus` and the Fulfillor status sync, so it fires whenever a B2B order becomes **`delivered`** (the default `b2b_invoice_trigger`). Creates the invoice with `due_date = invoice_date + credit_period_days` (credit orders) or due immediately. Idempotent through `UNIQUE(order_id)`.
- `DealerPaymentService`: dealer submits a transfer proof or cheque details, and admin records cash/cheque. Status machine `pending → received → under_verification → cleared | bounced | cancelled`. **Only `cleared`** creates allocations (oldest invoice first, or as chosen by admin), a ledger `payment` row, and invoice and order payment status updates. Bounced-after-cleared posts a `reversal`. Retail and immediate-pay B2B orders also get `payment_transactions` rows for consistency.
- Admin adjustments: credit note / debit adjustment (permission `b2b.ledger.adjust`, reason required). Refunds post a `refund` or `credit_note`.
- Cron: `b2b:overdue-reminders` (daily) and `b2b:reconcile-credit` (nightly).
- UI: account "Invoices & Credit" (summary, invoices, statement, submit payment). Admin Credit overview, the dealer detail credit/ledger tabs, the Payments verification queue, and Reports (aging, sales by dealer, conversion).

## Phase 6: Profile change requests, notification preferences, polish

- Dealer Business Profile page. Sensitive-field change requests go through an admin review queue on the dealer detail page. Non-sensitive fields (phone, WhatsApp, notes) update directly and are logged.
- B2B notification preferences, admin-editable templates and terms page content.
- Accessibility, mobile layout and i18n (ar) review of new pages.

## Phase 7: Hardening, tests, docs, deploy

- Full test matrix (below), a security review against Part 10, and an index review with `EXPLAIN` on new list queries.
- Final docs: `FINAL_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_DOCUMENTATION.md`, `ADMIN_GUIDE.md`, `DEALER_USER_GUIDE.md`, `SECURITY_REVIEW.md`, `TEST_RESULTS.md`, `DEPLOYMENT_GUIDE.md` (migrations order, cron entries, storage folder, env vars, rollback).

## Test plan (Playwright API specs in `e2e/tests/b2b/`, existing framework)

| Spec | Covers |
|---|---|
| `00-retail-regression` | register/login, retail price unchanged, retail checkout, only retail methods returned, cheque/credit rejected for retail, existing order unaffected |
| `01-registration` | required fields, MIME/size rejects, docs not reachable by URL or by another user, status transitions, resubmission |
| `02-access-by-status` | draft/pending/under_review/rejected/suspended/expired get 403 on pricing and B2B checkout; approved gets 200 |
| `03-pricing` | wholesale for approved, retail for others, min qty, tampered `unit_price`/`total` ignored, historical order prices stable after a price edit, wholesale fields absent from public APIs |
| `04-quotations` | first order creates a quotation, outbox rows created, revise keeps versions, accept/reject, double-accept gives one order (parallel requests), stock deducted once, second order is a normal order, rejected first quotation keeps the requirement |
| `05-payments` | method matrix per channel (retail = cod/bank_transfer only; cheque/credit/online_card rejected), new orders no longer auto-paid, COD collected / transfer verified gives exactly one transaction, cheque not counted until cleared, bounce reversal, invoice created on `delivered` only |
| `06-credit` | limit enforced, **N parallel credit orders never exceed the limit**, partial/full payment, overdue detection (time-shifted data), reversal/refund keep ledger sum = balance |
| `07-authorization` | dealer A cannot read B's quotations/orders/invoices/payments/documents/credit (404); admin without permission gets 403 on credit/approve/verify/ledger; super admin OK |

A small PHP CLI script `backend/tests/ledger_invariants.php` checks the ledger sum against the cached balances. It also runs in CI and in nightly reconciliation.

## Effort sketch (one full-stack developer)

Phase 0: 2–3 d · Phase 1: 6–8 d · Phase 2: 4–5 d (incl. backfill tooling) · Phase 3: 4–6 d (no gateway) · Phase 4: 7–9 d · Phase 5: 9–12 d · Phase 6: 3–4 d · Phase 7: 5–6 d. **About 8–10 weeks in total.** Add 3–5 days later for the card gateway.
