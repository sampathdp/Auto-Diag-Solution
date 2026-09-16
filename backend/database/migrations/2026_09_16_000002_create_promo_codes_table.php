<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Every promo code must belong to exactly one sales rep (sales_rep_id is NOT NULL —
// see the master spec's "promo code must belong to a sales representative" rule).
// commission_base is stored per-code (not a single global setting) so different reps/
// codes can be configured differently, per the admin UI's "Commission Calculation Base"
// field on the promo code form.
class CreatePromoCodesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS promo_codes (
                id                        BIGINT PRIMARY KEY AUTO_INCREMENT,
                code                      VARCHAR(50) NOT NULL,
                description               VARCHAR(500) NULL,
                sales_rep_id              BIGINT NOT NULL,
                discount_type             ENUM('percentage','fixed_amount') NOT NULL DEFAULT 'percentage',
                discount_value            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                commission_type           ENUM('percentage','fixed_amount') NOT NULL DEFAULT 'percentage',
                commission_value          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                commission_base           ENUM('original_subtotal','discounted_subtotal','final_total') NOT NULL DEFAULT 'discounted_subtotal',
                minimum_order_amount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                maximum_discount_amount   DECIMAL(10,2) NULL,
                usage_limit               INT NULL,
                used_count                INT NOT NULL DEFAULT 0,
                start_date                DATE NULL,
                expiry_date               DATE NULL,
                status                    ENUM('active','inactive') NOT NULL DEFAULT 'active',
                created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_promo_codes_code (code),
                INDEX idx_promo_codes_sales_rep_id (sales_rep_id),
                INDEX idx_promo_codes_status (status),
                CONSTRAINT fk_promo_codes_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS promo_codes;");
    }
}
