<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// B2B Phase 3: one order table for both channels (INTEGRATION_ARCHITECTURE.md §2.1).
// Existing rows become channel 'retail' with retail-priced items, which is what they
// are. quotation_id is UNIQUE now (conversion idempotency); its FK to
// dealer_quotations is added in Phase 4 when that table exists.
// payment_status gains 'pending_verification' (bank transfer awaiting a check) and
// 'partially_paid' (dealer invoices, Phase 5). The existing values keep their meaning.
class AlterOrdersAddB2bPaymentFields extends Migration
{
    public function up(): void
    {
        $this->execute("
            ALTER TABLE orders
                ADD COLUMN channel           ENUM('retail','b2b') NOT NULL DEFAULT 'retail' AFTER user_id,
                ADD COLUMN dealer_profile_id BIGINT NULL AFTER channel,
                ADD COLUMN quotation_id      BIGINT NULL AFTER dealer_profile_id,
                ADD COLUMN payment_terms     VARCHAR(255) NULL AFTER payment_reference,
                MODIFY COLUMN payment_status ENUM('pending','pending_verification','partially_paid','paid','failed','refunded') NOT NULL DEFAULT 'pending',
                ADD UNIQUE KEY uq_orders_quotation_id (quotation_id),
                ADD INDEX idx_orders_channel_created (channel, created_at),
                ADD INDEX idx_orders_dealer (dealer_profile_id, created_at),
                ADD INDEX idx_orders_payment_method (payment_method),
                ADD CONSTRAINT fk_orders_dealer_profile FOREIGN KEY (dealer_profile_id) REFERENCES dealer_profiles(id) ON DELETE RESTRICT;
        ");

        $this->execute("
            ALTER TABLE order_items
                ADD COLUMN pricing_type      ENUM('retail','wholesale','quoted') NOT NULL DEFAULT 'retail' AFTER unit_price,
                ADD COLUMN retail_unit_price DECIMAL(10,2) NULL AFTER pricing_type;
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE order_items
                DROP COLUMN retail_unit_price,
                DROP COLUMN pricing_type;
        ");

        // Rows using the new payment statuses are folded back onto the closest old value
        // so the narrower ENUM can be applied.
        $this->execute("UPDATE orders SET payment_status = 'pending' WHERE payment_status IN ('pending_verification','partially_paid')");
        $this->execute("
            ALTER TABLE orders
                DROP FOREIGN KEY fk_orders_dealer_profile,
                DROP INDEX idx_orders_payment_method,
                DROP INDEX idx_orders_dealer,
                DROP INDEX idx_orders_channel_created,
                DROP INDEX uq_orders_quotation_id,
                MODIFY COLUMN payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
                DROP COLUMN payment_terms,
                DROP COLUMN quotation_id,
                DROP COLUMN dealer_profile_id,
                DROP COLUMN channel;
        ");
    }
}
