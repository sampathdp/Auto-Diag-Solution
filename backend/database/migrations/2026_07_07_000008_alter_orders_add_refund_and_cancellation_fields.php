<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterOrdersAddRefundAndCancellationFields extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE orders ADD COLUMN refund_requested_at TIMESTAMP NULL AFTER payment_reference;");
        $this->execute("ALTER TABLE orders ADD COLUMN cancellation_reason TEXT NULL AFTER notes;");
        // payment_status alone (idx_orders_status already covers order status) — admin
        // "all orders awaiting payment/refund" filter, independent of order status.
        $this->execute("ALTER TABLE orders ADD INDEX idx_orders_payment_status (payment_status);");
        // Admin "recent orders across all customers" list — idx_orders_user_id_created_at's
        // leftmost column is user_id, so it can't serve a customer-agnostic recency query.
        $this->execute("ALTER TABLE orders ADD INDEX idx_orders_created_at (created_at);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE orders DROP INDEX idx_orders_created_at;");
        $this->execute("ALTER TABLE orders DROP INDEX idx_orders_payment_status;");
        $this->execute("ALTER TABLE orders DROP COLUMN cancellation_reason;");
        $this->execute("ALTER TABLE orders DROP COLUMN refund_requested_at;");
    }
}
