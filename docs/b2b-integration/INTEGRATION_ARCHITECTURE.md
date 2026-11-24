# B2B Integration Architecture

## 0. Guiding decisions

1. **No separate dashboards.** Dealer features become extra sections of the existing customer account area (`/[locale]/account/*`). They are shown only to approved dealers. Admin features become a **B2B** nav group inside the existing admin shell (`/admin/b2b/*`). Dealer orders are shown in the existing Orders page through a `channel` filter, not a copy of it.
2. **A dealer is an existing `customer` user plus a `dealer_profiles` row.** No new user table and no `users.role` ENUM change. Dealer status is read from the DB on every B2B request and is never trusted from the JWT, so a suspension takes effect immediately.
3. **One catalog, one order table.** Wholesale pricing is extra columns on `products`. B2B orders are `orders` rows with `channel='b2b'`.
4. **Public catalog APIs stay retail-only and cacheable.** Wholesale prices come only from an authenticated dealer endpoint.
5. **The server decides every price, payment method and credit check.** The frontend only displays.
6. **Money is DECIMAL in the DB.** Ledger arithmetic happens in integer cents in PHP.
7. **Market is UAE** (decision 2026-11-22). Currency is AED, VAT is the existing 5% logic, addresses use emirates, and the brief's Sri Lankan terms map to their UAE equivalents: BR copy → **Trade Licence**, tax ID → **TRN** (VAT Tax Registration Number), NIC → **Emirates ID**, district → **emirate**. Examples in the brief given in LKR are read as AED.
8. **Email only** (no SMS) for every notification.
9. **Payments today are Cash on Delivery and Bank Transfer.** The online card gateway is on hold: checkout shows it as "Coming soon" and disabled, and no gateway is integrated until the client picks one.
10. **The credit period starts on delivery.** An order is invoiced when its status becomes `delivered`.
11. **Wholesale price is mandatory** on every product.

## 1. Backend modules (follow the existing Controller → Service → Repository pattern)

```
app/Services/B2B/
  DealerContext.php            — resolves {user, dealerProfile, isApprovedDealer} for a request (memoised)
  DealerApplicationService.php — draft/submit/resubmit, document handling, status transitions
  DealerAdminService.php       — review, approve (dealer code + credit config), reject, suspend, notes
  PricingService.php           — getUnitPrice(ctx, product, qty) / priceLines(ctx, lines)
  PaymentMethodPolicy.php      — allowed methods per channel + settings; validate(method, ctx, total)
  QuotationService.php         — create, revise (versioned), message, approve/reject, accept, convert
  OrderPlacementService.php    — shared order-writing core extracted from CheckoutService::createOrder
  CreditService.php            — lock account, check exposure, reserve/release, post ledger entries
  InvoiceService.php           — create invoice on trigger event, due dates, overdue
  DealerPaymentService.php     — record bank transfer/cheque/cash, verify, clear, bounce, allocate
  PrivateDocumentStorage.php   — write/read outside web root, checksum, stream with auth
  NotificationOutbox.php       — enqueue email; console dispatcher sends via SimpleSmtpMailer + retries
app/Middleware/
  DealerMiddleware.php         — 403 unless DealerContext is approved & active & within activation window
  PermissionMiddleware.php     — changed: only super admins bypass (see §6)
app/Controllers/B2B/
  PartnerController (public info + settings), DealerApplicationController, DealerAccountController,
  DealerPricingController, DealerQuotationController, DealerInvoiceController, DealerPaymentController,
  DealerDocumentController, Admin/* (applications, dealers, quotations, credit, payments, reports, settings)
```

`CheckoutService` keeps its public methods. `createOrder` delegates line pricing to `PricingService` (retail context returns `products.price` exactly as it does today) and payment fields to `PaymentMethodPolicy`. Retail behaviour stays the same except that the mock auto-paid flow is replaced by real retail methods (see §5 and Risk R2).

## 2. Database design (new tables + extensions)

All money columns are `DECIMAL(14,2)` (ledger and credit) or `DECIMAL(10,2)` (to match existing order columns). All timestamps are `TIMESTAMP` in UTC, as in the existing schema. FKs to financial rows use `RESTRICT`.

### 2.1 Extensions to existing tables

```sql
ALTER TABLE products
  ADD COLUMN wholesale_price   DECIMAL(10,2) NULL AFTER price,     -- mandatory in app validation; NULL only on legacy rows until backfilled
  ADD COLUMN wholesale_min_qty INT UNSIGNED NULL AFTER wholesale_price,
  ADD INDEX idx_products_wholesale_missing (wholesale_price);
-- Step 2 (separate migration, after the admin backfills every product):
-- ALTER TABLE products MODIFY wholesale_price DECIMAL(10,2) NOT NULL;
-- Its up() refuses to run while any row still has wholesale_price IS NULL.

ALTER TABLE orders
  ADD COLUMN channel           ENUM('retail','b2b') NOT NULL DEFAULT 'retail' AFTER user_id,
  ADD COLUMN dealer_profile_id BIGINT NULL AFTER channel,
  ADD COLUMN quotation_id      BIGINT NULL AFTER dealer_profile_id,
  ADD COLUMN payment_terms     VARCHAR(255) NULL AFTER payment_reference,
  ADD UNIQUE KEY uq_orders_quotation_id (quotation_id),            -- conversion idempotency
  ADD INDEX idx_orders_channel_created (channel, created_at),
  ADD INDEX idx_orders_dealer (dealer_profile_id, created_at),
  ADD FOREIGN KEY ... dealer_profiles(id) RESTRICT, dealer_quotations(id) RESTRICT;
ALTER TABLE orders MODIFY payment_status
  ENUM('pending','pending_verification','partially_paid','paid','failed','refunded') NOT NULL DEFAULT 'pending';

ALTER TABLE order_items
  ADD COLUMN pricing_type      ENUM('retail','wholesale','quoted') NOT NULL DEFAULT 'retail' AFTER unit_price,
  ADD COLUMN retail_unit_price DECIMAL(10,2) NULL AFTER pricing_type;  -- savings display / reporting

ALTER TABLE users ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0;  -- existing admins backfilled to 1
```

### 2.2 New tables

| Table | Purpose / key columns |
|---|---|
| `dealer_profiles` | `user_id` UNIQUE FK; `status ENUM('draft','pending_review','under_review','approved','rejected','suspended')`; `dealer_code` UNIQUE NULL; business fields (registered name, trade licence number, trade licence expiry, TRN (15 digits, optional if not VAT-registered), business email/phone, WhatsApp, business_type, notes); owner (full name, id_type ENUM('emirates_id','driving_licence'), id_number (Emirates ID format `784-YYYY-NNNNNNN-N`)); location (address, emirate ENUM (same values as `customer_addresses.emirate`), city, area, district_id FK shipping_districts NULL, po_box NULL, map_url, latitude DECIMAL(10,7), longitude DECIMAL(10,7)); `wholesale_enabled`, `requires_quotation` (default from setting), `force_quotation` (admin override), `first_order_completed_at`; `activated_at`, `expires_at`; `allow_resubmission`; `rejection_reason`; `submitted_at`, `reviewed_by`, `reviewed_at`. Indexes: status, business name, BR number |
| `dealer_status_history` | profile_id, from_status, to_status, reason, changed_by, created_at (append-only) |
| `dealer_documents` | profile_id, `doc_type ENUM('trade_licence','trn_certificate','emirates_id_front','emirates_id_back','dl_front','dl_back','payment_proof','cheque_image','other')`, `storage_key` (private path, never exposed), original_name, mime, size_bytes, sha256, `status ENUM('active','superseded')`, uploaded_by, created_at |
| `dealer_profile_change_requests` | profile_id, `changes JSON` (sensitive fields only), status pending/approved/rejected, reviewed_by, reason |
| `dealer_credit_accounts` | profile_id PK/FK; `credit_enabled`; `credit_limit DECIMAL(14,2)`; `credit_period_days SMALLINT UNSIGNED`; `payment_terms_text`; `outstanding_balance DECIMAL(14,2)` (sum of open invoices); `reserved_amount DECIMAL(14,2)` (credit orders not yet invoiced); `updated_at`. Changed only inside `CreditService` transactions |
| `dealer_credit_ledger` | profile_id, `entry_type ENUM('invoice','payment','credit_note','debit_adjustment','credit_adjustment','refund','reversal')`, `amount DECIMAL(14,2)` signed (+ increases debt), `balance_after DECIMAL(14,2)`, invoice_id NULL, payment_id NULL, `reverses_entry_id` NULL UNIQUE, memo, created_by, created_at. **Insert-only**: no UPDATE/DELETE in code; reversals are new rows |
| `dealer_invoices` | `invoice_number` UNIQUE, order_id UNIQUE FK, profile_id, invoice_date, `due_date` NULL (immediate-pay dealers), amount, amount_paid, `status ENUM('unpaid','partially_paid','paid','void')`. Overdue = `status IN (unpaid, partially_paid) AND due_date < CURDATE()` (computed, indexed on `(profile_id, status, due_date)`) |
| `dealer_payments` | profile_id, order_id NULL, `method ENUM('bank_transfer','cheque','cash')` (cash = COD collected or paid at the counter; append `online_card` when the gateway arrives), amount, reference, `status ENUM('pending','received','under_verification','cleared','bounced','cancelled')`; cheque_number, cheque_bank, cheque_date; proof_document_id FK dealer_documents; recorded_by, verified_by, cleared_at, bounced_at, notes. UNIQUE(method, cheque_bank, cheque_number) for cheques |
| `dealer_payment_allocations` | payment_id, invoice_id, amount. Created when a payment clears |
| `dealer_payment_events` | payment_id, from_status, to_status, actor, note, created_at (audit trail for cheques/transfers) |
| `dealer_quotations` | `quotation_number` UNIQUE (`QUO-yymmdd-XXXXXX`), profile_id, `status ENUM('draft','submitted','under_review','discussion_required','revised','approved','rejected','expired','converted','cancelled')`, `current_version` INT, subtotal/discount/shipping/vat/total, `payment_method_pref`, shipping_snapshot JSON, `expires_at`, `dealer_accepted_at`, `converted_order_id` UNIQUE NULL, `is_first_order`, submitted_at, timestamps |
| `dealer_quotation_items` | quotation_id, product_id, sku/name snapshot, quantity, unit_price, retail_unit_price, line_total (the **current** version) |
| `dealer_quotation_versions` | quotation_id, version_no, `snapshot JSON` (items + totals + notes), created_by, reason, created_at. UNIQUE(quotation_id, version_no) |
| `dealer_quotation_messages` | quotation_id, author_id, `visibility ENUM('dealer','internal')`, body, created_at |
| `user_permissions` | user_id, permission VARCHAR(100), UNIQUE(user_id, permission) |
| `notification_outbox` | channel ENUM('email') (an ENUM so other channels can be appended later), recipient, template, payload JSON, status pending/sent/failed, attempts, last_error, available_at, sent_at. Index (status, available_at) |

B2B settings go into the existing `settings` table with `group_name='b2b'` (see §8).

**Deliberately deferred (YAGNI, but schema allows it):** per-dealer price overrides and dealer groups. When they are needed, add `dealer_price_overrides(product_id, profile_id NULL, dealer_group_id NULL, min_qty, unit_price)` and let `PricingService` consult it. No other code changes, because all pricing goes through one function.

## 3. Pricing engine

`PricingService::priceLines(DealerContext $ctx, array $lines): array` (batch version, so there is no N+1).

Rules, in order:
1. No user, a guest, a non-dealer, or a dealer whose status is not `approved` (or who is outside `activated_at`/`expires_at`, or has `wholesale_enabled=0`): **retail**. `unit_price = products.price`, `pricing_type='retail'`.
2. Approved dealer and `qty >= COALESCE(wholesale_min_qty, 1)`: **wholesale**.
3. Approved dealer but qty below the minimum: retail price, with the response flagging `min_qty_for_wholesale`.
4. Legacy product with `wholesale_price IS NULL` (only possible before the backfill finishes): retail price, and the product is listed in the admin "Missing wholesale price" filter. After step 2 of the migration this case cannot happen.

**Validation (`ProductService::validate`, the only create/update path, also used by `ProductSeeder`):** `wholesale_price` is required, must be > 0, and must be ≤ `price`. A wholesale price above retail is rejected with a 422. `wholesale_min_qty` is optional and ≥ 1. The admin product form marks the field as required, and the zod schema in `lib/admin/schemas` matches these rules.

Called from: the dealer pricing endpoint, `CheckoutService` (both channels), `QuotationService::create/revise`, and conversion (which uses the **accepted quotation prices**, `pricing_type='quoted'`, not live prices).

**Catalog display:** `POST /api/v1/dealer/pricing {product_ids[]}` (DealerMiddleware) returns `{product_id: {retail, wholesale, min_qty, savings}}`. The storefront `ProductCard`, `ProductDetailView` and cart use a `useDealerPricing(ids)` React Query hook that runs only when `account.dealer.status==='approved'`. Public SSR pages and caches never see wholesale data, and a pending dealer flipping local state gets a 403 from the endpoint.

## 4. Order flows

```
Dealer checkout ─► POST /account/checkout {channel:'b2b', payment_method, items[], ...}
   │  DealerMiddleware-equivalent check inside service (approved, active)
   │  PricingService (wholesale) ─► totals
   │  needsQuotation = requires_quotation && first_order_completed_at IS NULL
   │                   || force_quotation || any product flagged quote_only (future)
   ├─ needsQuotation ─► QuotationService::create (status 'submitted', v1 snapshot) ─► outbox emails (dealer + sales)
   └─ else ─► OrderPlacementService (channel b2b) ─► PaymentMethodPolicy ─► CreditService if method=credit
```

**Quotation lifecycle:** submitted, then under_review, then (discussion_required, revised)* by admin, then approved by admin. The dealer then accepts, which triggers convert (or the dealer rejects, giving rejected). Expiry runs from cron (`b2b:expire-quotations`). Each admin revision writes a `dealer_quotation_versions` row before the items are overwritten. An approved quotation the dealer has not accepted expires at `expires_at`. Admin approval of an unrevised quotation counts as the final version, and the dealer still accepts.

**Conversion (atomic, exactly once):**
```
BEGIN
  SELECT * FROM dealer_quotations WHERE id=? FOR UPDATE
  assert status='approved' AND dealer_accepted_at IS NOT NULL AND converted_order_id IS NULL AND not expired
  re-check dealer approved/active
  if method=credit: CreditService::reserve(profile, total)  -- locks dealer_credit_accounts row FOR UPDATE
  OrderPlacementService::create(lines = quotation items, pricing_type='quoted', quotation_id=?)  -- UNIQUE(quotation_id) backstop
  decrementStock (guarded) per line  -- fails => rollback, quotation stays approved, dealer told which item
  UPDATE dealer_quotations SET status='converted', converted_order_id=?
  UPDATE dealer_profiles SET first_order_completed_at = COALESCE(first_order_completed_at, NOW())
COMMIT ─► outbox notifications
```
A repeated "accept" call sees `converted` and returns the existing order (idempotent). First-order eligibility depends only on `first_order_completed_at`, which is set only by a successful conversion. Rejected or expired quotations never set it.

## 5. Payment methods

`PaymentMethodPolicy` is the single source of truth. The checkout UI asks `GET /account/checkout/payment-methods`, and the server validates again on submit.

| Code | Retail | B2B | Initial `payment_status` | Status now |
|---|---|---|---|---|
| `cod` | yes | yes | pending (collected on delivery; admin or delivery confirmation marks it paid) | **live** |
| `bank_transfer` | yes | yes | pending_verification (bank details shown; proof upload; admin verifies) | **live** |
| `cheque` | **no** | yes | pending (cheque record created; cleared only by admin; post-dated cheques allowed) | new, B2B only |
| `credit` | **no** | yes (credit_enabled) | pending; order allowed only if credit is available | new, B2B only |
| `online_card` | shown | shown | none (cannot be selected) | **on hold:** "Coming soon", disabled |
| `card_on_delivery` | no | no | none | not offered now; settings toggle only |

The brief's "Online Transfer" is the same as `bank_transfer` in the UAE (a bank app transfer to the company IBAN), so there is one method, not two.

Each method can be switched on or off in settings per channel. Bank details (bank name, account holder, account number, **IBAN**, SWIFT, branch, reference instructions) come from settings (`payment_bank_accounts` JSON, shared by retail and B2B). The payment reference shown to the customer is the order number.

**Replacing the mock checkout:** today `CheckoutService` writes `payment_method='mock'`, `payment_status='paid'`. That is replaced by the customer's chosen method (`cod` or `bank_transfer`) with the real pending status. The admin order page gains "Mark COD collected" and "Verify bank transfer" actions, which insert `payment_transactions` rows with provider `cod` or `bank_transfer` and a unique reference. The VIN verification hold and Fulfillor flow are unchanged. `mock` stays only when `APP_ENV != production`, for e2e tests.

**Online card gateway (on hold):** the checkout keeps the existing "Coming soon" card tile. The code leaves a seam: a `PaymentGateway` interface and the `online_card` method code reserved in `PaymentMethodPolicy`, always rejected server-side while `payment_online_card_enabled=false`. When the client picks a provider, the adapter must verify the callback signature, load the order by reference server-side, compare amount and currency, then insert `payment_transactions`. `UNIQUE(provider, provider_reference)` makes replays no-ops.

## 6. Authorization model

- `users.is_super_admin` (existing admins backfilled to 1, so nothing changes for them). `PermissionMiddleware` bypasses only for super admins.
- `user_permissions` rows are loaded into the JWT `permissions[]` by `JWTService::getUserPermissions`. **Financial operations re-check against the DB** through `PermissionService::userHas($userId, $perm)`, so a revoked permission doesn't survive the life of an access token.
- Permissions: `b2b.applications.view`, `b2b.applications.review` (approve/reject), `b2b.dealers.suspend`, `b2b.documents.view`, `b2b.credit.manage`, `b2b.pricing.manage` (wholesale fields on the product form), `b2b.quotations.manage`, `b2b.quotations.approve`, `b2b.payments.record`, `b2b.payments.verify` (clear/bounce), `b2b.ledger.adjust`, `b2b.reports.view`, `b2b.settings.manage`.
- Admin UI: a permission editor on the existing admin user page (`/admin/profile` or the users list), used by super admins only.
- Dealer endpoints: every query is scoped `WHERE dealer_profile_id = :ctxProfileId`. A missing row returns 404, never 403, so IDs can't be probed.

## 7. Private documents

- Stored at `backend/storage/private/dealer-docs/{profileId}/{random}.{ext}`, **outside `public/`**, with `.htaccess` `Require all denied` as a second layer. Uses `FileUploader` validation (finfo MIME: jpg/png/webp/pdf; max 5 MB per file, set in settings). No WebP transcoding for identity docs, so originals are kept. SHA-256 is stored.
- Served only by `GET /api/v1/account/dealer/documents/{id}` (owner) and `GET /api/v1/admin/b2b/documents/{id}` (needs `b2b.documents.view`, logged to `admin_activity_logs`). Responses send `Content-Disposition`, `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`.
- Admin preview: the frontend fetches with the bearer token, turns the response into a blob URL and shows it in a modal (image/PDF). There are no public URLs and paths are never returned.
- Document metadata (type, size, uploaded_at) is the only thing APIs return.

## 8. Settings (group `b2b`, existing settings table and admin UI)

`b2b_registration_enabled`, `b2b_first_order_requires_quotation`, `b2b_default_credit_enabled`, `b2b_default_credit_period_days`, `b2b_quotation_expiry_days`, `b2b_invoice_trigger` (default **`delivered`**; `shipped` also allowed), `b2b_payment_methods` (JSON, default `["cod","bank_transfer","cheque","credit"]`), `retail_payment_methods` (JSON, default `["cod","bank_transfer"]`), `payment_online_card_enabled` (default false), `payment_bank_accounts` (JSON), `b2b_sales_team_emails` (JSON), `b2b_terms_html`, `b2b_max_document_mb`, `b2b_notification_templates` (JSON subject/body overrides).

## 9. Notifications

`NotificationOutbox::enqueue()` is called **after commit**. `php console.php notifications:dispatch` runs every minute from cron (the same pattern as `fulfillor:sync`) and sends through `SimpleSmtpMailer`. It retries with backoff up to 5 attempts. A failure only marks the outbox row and never touches the business record. **Email only. There is no SMS.** Approval emails carry everything the brief put in the SMS: the dealer code, credit terms and login steps. Templates are HTML in the style of `OrderMailService`, with subjects and bodies that can be overridden in settings.

Events: application submitted (admin), info requested, approved (code, credit terms, login steps), rejected (reason, resubmission), suspended, quotation submitted (dealer + sales), quotation revised, approved, rejected or expiring, order confirmed, payment received/cleared/bounced, invoice issued, invoice overdue (cron `b2b:overdue-reminders`).

## 10. UI placement (no separate dashboards)

### Storefront
- `SiteHeader`: add **Become a Partner** (`/partner`), with en/ar messages. For an approved dealer, show a "Dealer" badge on the account icon. The label becomes "Partner Account", which links to `/account/overview`.
- `/partner`: info page, then a CTA. If logged out: register/login, then step 2. If a draft exists: continue the form. If pending, under review or rejected: a status card (rejection reason, and a resubmit button if allowed).
- `/partner/apply`: multi-step form (react-hook-form + zod, matching server rules) with file inputs and draft save.
- Product card, detail page, cart and checkout: when the user is an approved dealer, show the dealer price, the retail price struck through, and the savings (from the pricing endpoint). Checkout shows the methods the server returns, and a quotation notice when one is required.

### Account area (`account/layout.tsx` nav, dealer-only items added conditionally)
- Overview: existing widgets, plus dealer widgets (pending quotations, total purchases, outstanding, available credit, overdue count).
- Orders: existing page. B2B orders show payment method, terms and invoice link.
- **Quotations** (new): list/detail, versions diff, messages, accept/reject, print view.
- **Invoices & Credit** (new): credit summary, invoices (unpaid/partial/paid/overdue), ledger statement, payment history, and "submit payment" (bank transfer proof / cheque details).
- **Business Profile** (new): read-only details, a change-request form for sensitive fields, and documents (metadata plus owner download).
- Notifications: existing page. B2B events are added to the preferences.

### Admin (`nav-items.ts`, new group **B2B**)
- Dealer Applications (`/admin/b2b/applications`, `/[id]`): DataTable, filters, search, detail, document viewer, map link, notes (`NotesPanel`), approve modal (dealer code, wholesale on/off, credit on/off/limit/days/terms, activation/expiry), reject (reason, allow resubmit), request info.
- Dealers (`/admin/b2b/dealers`, `/[id]`): approved/suspended list; detail tabs for profile, credit, ledger, invoices, payments, quotations, change requests; suspend/reactivate.
- Dealer Orders: links to the existing `/admin/orders?channel=b2b`. The Orders page gets a channel filter and a dealer column.
- Quotations (`/admin/b2b/quotations`, `/[id]`): line editor (qty, price, discount, shipping), versions, internal and dealer messages, status actions, expiry.
- Credit (`/admin/b2b/credit`): all dealers with limit, outstanding, available and overdue; adjustments (needs `b2b.ledger.adjust`).
- Payments (`/admin/b2b/payments`): verification queue for transfers and cheques; record, receive, clear, bounce or cancel; allocation.
- Reports (`/admin/b2b/reports`): sales by dealer, aging (0–30/31–60/61–90/90+), quotation conversion rate. CSV export via the existing `csvExport.ts`.
- Settings: a **B2B** tab in the existing `/admin/settings` page.
- Product form: a "Wholesale" section (price **required**, min qty optional), editable only with `b2b.pricing.manage`. An admin without the permission sees the value read-only. The server keeps the stored value and ignores any submitted one. Creating a product requires the permission or a super admin, because the field is mandatory.
- Products list: a "Missing wholesale price" filter and a count badge (used during the backfill), plus a CSV export/import of `sku, wholesale_price` for bulk backfill.

## 11. Performance

- The pricing endpoint is a single `SELECT id, price, wholesale_price, wholesale_min_qty FROM products WHERE id IN (...)`, plus one cached profile lookup per request.
- Credit summary reads `dealer_credit_accounts` (maintained transactionally), not ledger sums. A nightly `b2b:reconcile-credit` command recomputes from the ledger and invoices and alerts on drift.
- All new lists are paginated through the existing `QueryBuilder::paginate`. New indexes are listed in §2.
- Public catalog queries are unchanged, so retail performance is unaffected.
