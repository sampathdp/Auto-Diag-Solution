<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Every payment-provider attempt/webhook event against an order, kept separate from
// orders.payment_reference so retries, partial refunds, and webhook replays all have
// their own auditable row instead of overwriting a single field on the order.
class CreatePaymentTransactionsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
                order_id            BIGINT NOT NULL,
                provider            VARCHAR(50) NOT NULL DEFAULT 'stripe',
                provider_reference  VARCHAR(255) NULL,
                type                ENUM('payment','refund') NOT NULL DEFAULT 'payment',
                status              ENUM('pending','succeeded','failed','cancelled') NOT NULL DEFAULT 'pending',
                amount              DECIMAL(10,2) NOT NULL,
                currency            VARCHAR(3) NOT NULL DEFAULT 'AED',
                raw_payload         JSON NULL,
                created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_payment_transactions_provider_ref (provider, provider_reference),
                INDEX idx_payment_transactions_order_id (order_id, created_at),
                CONSTRAINT fk_payment_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS payment_transactions;");
    }
}
