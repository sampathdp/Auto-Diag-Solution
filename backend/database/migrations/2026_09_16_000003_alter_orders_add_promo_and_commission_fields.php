<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Snapshot columns, not live lookups: promo_code/discount_type/discount_value/
// commission_type/commission_value are copied onto the order at checkout time so a
// later edit/deactivation of the promo code or sales rep's commission rate never
// rewrites historical order/commission figures (orders.discount_amount already exists
// and is reused here — it's just been hardcoded to 0 by CheckoutService until now).
class AlterOrdersAddPromoAndCommissionFields extends Migration
{
    public function up(): void
    {
        $this->execute("
            ALTER TABLE orders
                ADD COLUMN promo_code_id     BIGINT NULL AFTER discount_amount,
                ADD COLUMN promo_code        VARCHAR(50) NULL AFTER promo_code_id,
                ADD COLUMN sales_rep_id      BIGINT NULL AFTER promo_code,
                ADD COLUMN discount_type     ENUM('percentage','fixed_amount') NULL AFTER sales_rep_id,
                ADD COLUMN discount_value    DECIMAL(10,2) NULL AFTER discount_type,
                ADD COLUMN commission_type   ENUM('percentage','fixed_amount') NULL AFTER discount_value,
                ADD COLUMN commission_value  DECIMAL(10,2) NULL AFTER commission_type,
                ADD COLUMN commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER commission_value,
                ADD INDEX idx_orders_promo_code_id (promo_code_id),
                ADD INDEX idx_orders_sales_rep_id (sales_rep_id),
                ADD CONSTRAINT fk_orders_promo_code FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL,
                ADD CONSTRAINT fk_orders_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(id) ON DELETE SET NULL;
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE orders
                DROP FOREIGN KEY fk_orders_promo_code,
                DROP FOREIGN KEY fk_orders_sales_rep,
                DROP INDEX idx_orders_promo_code_id,
                DROP INDEX idx_orders_sales_rep_id,
                DROP COLUMN promo_code_id,
                DROP COLUMN promo_code,
                DROP COLUMN sales_rep_id,
                DROP COLUMN discount_type,
                DROP COLUMN discount_value,
                DROP COLUMN commission_type,
                DROP COLUMN commission_value,
                DROP COLUMN commission_amount;
        ");
    }
}
