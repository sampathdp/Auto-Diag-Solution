<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// UNIQUE commission_id — a commission can be paid at most once (the master spec's
// "prevent the same commission from being paid twice" rule, enforced at the schema
// level rather than just in application code).
class CreateCommissionPaymentsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS commission_payments (
                id                BIGINT PRIMARY KEY AUTO_INCREMENT,
                sales_rep_id      BIGINT NOT NULL,
                commission_id     BIGINT NOT NULL,
                amount            DECIMAL(10,2) NOT NULL,
                payment_method    ENUM('bank_transfer','cash','other') NOT NULL DEFAULT 'bank_transfer',
                payment_reference VARCHAR(255) NULL,
                payment_date      DATE NOT NULL,
                notes             VARCHAR(1000) NULL,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_commission_payments_commission_id (commission_id),
                INDEX idx_commission_payments_sales_rep_id (sales_rep_id),
                CONSTRAINT fk_commission_payments_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(id) ON DELETE RESTRICT,
                CONSTRAINT fk_commission_payments_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS commission_payments;");
    }
}
