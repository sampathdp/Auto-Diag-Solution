<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// One commission row per order (UNIQUE order_id) — created as 'pending' at checkout,
// flipped to 'approved' when the order reaches its completion status (see
// OrderService::updateStatus), 'paid' once a commission_payments row is recorded
// against it, and 'cancelled' if the order is cancelled/refunded first.
class CreateCommissionsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS commissions (
                id                BIGINT PRIMARY KEY AUTO_INCREMENT,
                order_id          BIGINT NOT NULL,
                sales_rep_id      BIGINT NOT NULL,
                promo_code_id     BIGINT NULL,
                commission_type   ENUM('percentage','fixed_amount') NOT NULL,
                commission_value  DECIMAL(10,2) NOT NULL,
                commission_base   ENUM('original_subtotal','discounted_subtotal','final_total') NOT NULL,
                base_amount       DECIMAL(10,2) NOT NULL,
                commission_amount DECIMAL(10,2) NOT NULL,
                status            ENUM('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
                approved_at       TIMESTAMP NULL,
                paid_at           TIMESTAMP NULL,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_commissions_order_id (order_id),
                INDEX idx_commissions_sales_rep_id (sales_rep_id),
                INDEX idx_commissions_status (status),
                CONSTRAINT fk_commissions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                CONSTRAINT fk_commissions_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(id) ON DELETE RESTRICT,
                CONSTRAINT fk_commissions_promo_code FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS commissions;");
    }
}
