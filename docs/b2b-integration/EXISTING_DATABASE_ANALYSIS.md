# Existing Database Analysis

Source: `backend/database/migrations/*` (64 migrations, 2026-07-04 to 2026-11-18). MySQL InnoDB, utf8mb4_unicode_ci. All PKs are `BIGINT AUTO_INCREMENT`.

## 1. Core tables and relationships

```
users 1─* customer_addresses ─* orders *─1 users
users 1─* refresh_tokens / login_attempts / two_factor_recovery_codes / password_reset_tokens
users 1─* customer_vehicles, wishlists, notification_preferences, reviews
categories 1─* products *─1 brands ; products *─1 suppliers
products 1─* product_fitments, product_specifications, product_cross_references
carts 1─* cart_items *─1 products        (tables exist, cart is client-side in practice)
orders 1─* order_items *─1 products (SET NULL)
orders 1─* order_status_history, payment_transactions
orders *─1 promo_codes, sales_representatives ; orders 1─1 commissions ; commissions 1─* commission_payments
admin_activity_logs *─1 users (admin_id, SET NULL) ; admin_notes (entity_type/entity_id)
settings (key/value), pages, seo_meta, media, about_page, home_page, shipping_districts 1─* shipping_rates
```

## 2. Keys, constraints, indexes (relevant to B2B)

| Table | Notable constraints / indexes |
|---|---|
| users | `uq_users_email`, `uq_users_oauth(provider,id)`, `idx_users_role`, `idx_users_is_guest` |
| products | `uq_products_sku`, `uq_products_slug`, `idx_products_category_status`, `idx_products_status`, `idx_products_price`, stock indexes, FULLTEXT `ft_products_search`, brand/supplier FKs (SET NULL) |
| orders | `uq_orders_order_number`, `uq_orders_tracking_token_hash`, `idx_orders_user_id_created_at`, `idx_orders_status`, `idx_orders_payment_status`, `idx_orders_created_at`, fulfillor id index, promo/sales-rep FKs. `user_id` FK is **RESTRICT** (good: orders keep their user) |
| order_items | `order_id` CASCADE, `product_id` SET NULL. Snapshot columns keep history intact |
| payment_transactions | `UNIQUE(provider, provider_reference)`, `order_id` CASCADE |
| commissions | `UNIQUE(order_id)` (pattern for one-per-order idempotency) |
| cart_items | `UNIQUE(cart_id, product_id)` |

## 3. Status fields

- `orders.status`: pending, pending_vin_verification, paid, processing, shipped, delivered, cancelled, refunded
- `orders.payment_status`: pending, paid, failed, refunded (**no** `pending_verification` or `partially_paid`)
- `payment_transactions.status`: pending, succeeded, failed, cancelled; `type`: payment, refund
- `products.status`: draft, active, inactive; `stock_status`: in_stock, out_of_stock, backorder
- `users.is_active` boolean; `promo_codes.status`; `commissions.status`; `reviews` status

## 4. Soft deletes

None. Deletion is hard delete plus FK behaviour. Financial B2B tables must **not** be hard-deletable: use status and void rows instead, and FK `RESTRICT`.

## 5. Monetary handling

- All money columns are `DECIMAL(10,2)`. Good, no floats in the DB.
- PHP casts to `float` and uses `round(..., 2)` (`CheckoutService`). Acceptable for retail. For the credit ledger, use string/BCMath-style arithmetic, or integer cents in PHP, so sums don't drift.
- `DECIMAL(10,2)` caps at 99,999,999.99. Enough for AED credit limits (AED 500,000 fits). Use `DECIMAL(14,2)` for ledger and credit totals as headroom.
- Currency: `orders.currency DEFAULT 'AED'` and `settings.currency=AED`. See Risk R1.

## 6. Transaction boundaries (existing)

- `CheckoutService::createOrder`: one transaction covering the order, items, promo usage (guarded `consumeUsage`), commission, stock (guarded `decrementStock` = `UPDATE ... WHERE stock_quantity >= ?`) and the payment transaction. B2B order creation and quotation conversion follow this same pattern.
- Email is sent **after** commit (correct). B2B notifications follow the same rule through an outbox.

## 7. Issues found

| # | Issue | Impact on B2B |
|---|---|---|
| D1 | `customer_addresses.emirate` ENUM is UAE-specific | Dealer business address stored on the dealer profile, with `district_id` → `shipping_districts` |
| D2 | `carts` tables mostly unused, cart lives in localStorage | No server cart to reprice. Pricing is recalculated at checkout and quotation (already the case for retail) and shown via a pricing endpoint |
| D3 | `payment_status` lacks verification/partial states | Extend the ENUM (additive `MODIFY`, reversible) |
| D4 | `orders.payment_method` default `'stripe'` but checkout writes `'mock'` | Normalise method codes through `PaymentMethodPolicy` |
| D5 | No permission tables | New `user_permissions` table |
| D6 | Private uploads inside `public/` | New private storage path. Existing `payment-proofs` should migrate too (Risk R5) |
| D7 | `users.role` ENUM only admin/customer | Keep it. Dealer status lives in `dealer_profiles`, so there is no ENUM change on a hot table |

## 8. Migration compatibility rules for this project

- Only additive changes: `ADD COLUMN` with defaults/NULL, `ADD INDEX`, and ENUM `MODIFY` that only **appends** values.
- Every migration has a working `down()`. ENUM narrowing in `down()` must first remap rows that use new values (pattern used in `alter_orders_add_vin_verification_status`).
- No renames or drops of existing columns.
- Existing orders get `channel='retail'` by default, so no backfill is needed.
