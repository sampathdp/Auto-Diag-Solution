<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Bank transfer receipts uploaded by the customer (retail or dealer, signed in or via
// the guest tracking link). Files live in App\Core\PrivateStorage; storage_key never
// leaves the server. Admins view a proof, then confirm the payment on the order.
class CreateOrderPaymentProofsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS order_payment_proofs (
                id             BIGINT PRIMARY KEY AUTO_INCREMENT,
                order_id       BIGINT NOT NULL,
                storage_key    VARCHAR(255) NOT NULL,
                original_name  VARCHAR(150) NOT NULL,
                mime_type      VARCHAR(100) NOT NULL,
                size_bytes     INT UNSIGNED NOT NULL,
                sha256         CHAR(64) NOT NULL,
                uploaded_by    BIGINT NULL,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_order_payment_proofs_storage_key (storage_key),
                INDEX idx_order_payment_proofs_order (order_id, created_at),
                CONSTRAINT fk_order_payment_proofs_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
                CONSTRAINT fk_order_payment_proofs_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS order_payment_proofs;");
    }
}
