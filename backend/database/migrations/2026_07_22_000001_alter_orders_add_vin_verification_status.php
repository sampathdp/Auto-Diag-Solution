<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterOrdersAddVinVerificationStatus extends Migration
{
    public function up(): void
    {
        // New orders now land here instead of 'processing' — the 3PL push is held back
        // until an admin manually verifies the VIN and approves fulfillment (see
        // OrderService::approveForFulfillment / FulfillmentService::pushOrder).
        $this->execute("
            ALTER TABLE orders MODIFY COLUMN status
                ENUM('pending','pending_vin_verification','paid','processing','shipped','delivered','cancelled','refunded')
                NOT NULL DEFAULT 'pending';
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE orders MODIFY COLUMN status
                ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded')
                NOT NULL DEFAULT 'pending';
        ");
    }
}
