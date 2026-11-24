# B2B Risk Register

Severity: H = could cause financial loss, data exposure or retail breakage; M = rework or delay; L = minor.

## Decisions (confirmed 2026-11-22)

| ID | Question | Decision |
|---|---|---|
| Q1 | Market and currency | **UAE.** AED, existing 5% VAT, emirates. Brief terms are mapped: BR → Trade Licence, TIN → TRN, NIC → Emirates ID; LKR amounts read as AED |
| Q2 | Online card gateway | **On hold** (the client hasn't decided). Checkout keeps showing card as "Coming soon"; the server rejects `online_card` |
| Q3 | SMS | **Not used.** Email for all notifications |
| Q4 | Credit period start | **On delivery.** Invoice is created when a B2B order reaches `delivered` |
| Q5 | Wholesale price | **Mandatory** on every product (required, > 0, ≤ retail). Legacy products are backfilled, then the column becomes NOT NULL |
| Q6 | Live payment methods | **COD and Bank Transfer** for everyone; cheque and credit additionally for approved dealers. The mock auto-paid flow is replaced by these real pending statuses |

## Risks

| ID | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | Brief written for Sri Lanka; build is UAE, so terms may be translated incorrectly | L | Resolved by Q1: UAE equivalents fixed in the Architecture doc §0. Client to confirm the field list in the registration form mock-up |
| R1a | Mandatory wholesale price blocks admins from editing existing products until each one has a value | M | Intended, to force the backfill. CSV bulk backfill plus a "Missing wholesale price" filter. Ship Phase 2 with the backfill done in staging first |
| R1b | Removing mock auto-paid changes retail order state: orders now start `pending`/`pending_verification`, and reports or Fulfillor logic may assume `paid` | H | Audit every `payment_status='paid'` check (dashboard stats, commissions, Fulfillor approval) before Phase 3; regression tests; admin "Mark COD collected" action |
| R1c | Fulfillor-driven status sync marks orders delivered without passing through `OrderService::updateStatus`, so invoices are missed | M | Invoice hook placed in the shared status-change path used by both admin and sync; nightly check for delivered B2B orders with no invoice |
| R2 | Refactoring `CheckoutService` breaks retail checkout | H | Extract without behaviour change first, with the retail regression spec run before and after; feature flags for new methods |
| R3 | Wholesale prices leak through public/SSR catalog responses or Next.js cache | H | Separate authenticated pricing endpoint; explicit public column allowlist; e2e assertion that `wholesale_*` is absent |
| R4 | Concurrent credit orders exceed the limit | H | `SELECT ... FOR UPDATE` on `dealer_credit_accounts` inside the order transaction; reserved exposure counted; parallel-request test |
| R5 | Existing "private" uploads (`payment-proofs`, `documents`) sit in `public/uploads` and are served to any valid JWT (IDOR) | H (existing) | New B2B docs go to private storage with ownership checks. Separate task: migrate existing private types the same way and add web-server deny rules |
| R6 | Duplicate order or stock deduction on quotation conversion (double click, retry) | H | Row lock on the quotation, `UNIQUE(orders.quotation_id)`, idempotent accept response |
| R7 | Admins all have full rights (`PermissionMiddleware` bypass), so financial operations are unrestricted | H | `is_super_admin` plus `user_permissions`; DB-checked permissions on financial endpoints |
| R8 | Stale JWT permissions/status after suspension or permission revoke | M | Dealer status read from DB per request; financial permissions checked against DB |
| R9 | Synchronous SMTP slows or fails requests; with no SMS, email is the only channel | M | Outbox plus cron dispatcher with retries; notifications sent after commit and never roll back business actions; admin view of failed outbox rows with resend; dealer-facing status is always visible in the account area too |
| R10 | Cron unavailable or misconfigured on shared hosting, so quotations don't expire and reminders aren't sent | M | Expiry also checked lazily on read/accept; deploy guide lists cron entries; admin dashboard warns if the outbox backlog is older than 15 min |
| R11 | Ledger drift between cached balances and ledger rows | M | Insert-only ledger, same-transaction updates, nightly reconciliation, invariant script in CI |
| R12 | Float rounding in PHP money math | M | Integer-cents helpers for ledger/credit; DECIMAL columns; no float comparisons for limits |
| R13 | Large identity documents exceed PHP upload limits on shared hosting | L | Client-side size check; documented `upload_max_filesize`; per-file max setting (5 MB default) |
| R14 | ENUM `MODIFY` on the large `orders` table locks the table during migration | M | Run in a low-traffic window; additive-only change; backup first (deploy guide) |
| R15 | FTP deploy overwrites or deletes `backend/storage/private` | H | Exclude the folder in the workflow; store outside the deploy target if hosting allows; backup policy |
| R16 | Docs (`ARCHITECTURE.md`, `ADMIN_ARCHITECTURE.md`) are outdated and mislead future work | L | Final docs in `docs/b2b-integration/` describe actual architecture; flag the old docs |
| R17 | No email verification exists, but the brief says "if the existing system provides it" | L | Not required. Optional enhancement: verify the business email before submission |
| R18 | Dealers abuse the retail flow (logged in as dealer but checking out retail) | L | Channel is decided server-side from DealerContext, not from a client flag; approved dealers always get B2B pricing and methods |
