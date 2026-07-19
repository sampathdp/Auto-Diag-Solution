<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterOrdersAddFulfillorFields extends Migration
{
    public function up(): void
    {
        // Best-effort hand-off to Fulfillor (external fulfillment/WMS platform) after
        // checkout. fulfillor_sync_error is set whenever the push fails or is skipped
        // (e.g. unmapped products) so admins can see it without digging through logs.
        $this->execute("ALTER TABLE orders ADD COLUMN fulfillor_order_id VARCHAR(100) NULL AFTER delivered_at;");
        $this->execute("ALTER TABLE orders ADD COLUMN fulfillor_synced_at TIMESTAMP NULL AFTER fulfillor_order_id;");
        $this->execute("ALTER TABLE orders ADD COLUMN fulfillor_sync_error TEXT NULL AFTER fulfillor_synced_at;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE orders DROP COLUMN fulfillor_sync_error;");
        $this->execute("ALTER TABLE orders DROP COLUMN fulfillor_synced_at;");
        $this->execute("ALTER TABLE orders DROP COLUMN fulfillor_order_id;");
    }
}
