<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddIndexOrdersFulfillorOrderId extends Migration
{
    public function up(): void
    {
        // findSyncableFulfillorOrders() filters WHERE fulfillor_order_id IS NOT NULL —
        // was a full table scan with no index backing it.
        $this->execute("ALTER TABLE orders ADD INDEX idx_orders_fulfillor_order_id (fulfillor_order_id);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE orders DROP INDEX idx_orders_fulfillor_order_id;");
    }
}
