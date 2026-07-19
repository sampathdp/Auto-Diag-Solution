<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterOrdersAddShippingFields extends Migration
{
    public function up(): void
    {
        // Manual shipping assignment (no live courier API yet) — an admin picks a carrier
        // and types in the tracking number/label reference when dispatching an order.
        $this->execute("ALTER TABLE orders ADD COLUMN carrier VARCHAR(100) NULL AFTER cancellation_reason;");
        $this->execute("ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(150) NULL AFTER carrier;");
        $this->execute("ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMP NULL AFTER tracking_number;");
        $this->execute("ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP NULL AFTER shipped_at;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE orders DROP COLUMN delivered_at;");
        $this->execute("ALTER TABLE orders DROP COLUMN shipped_at;");
        $this->execute("ALTER TABLE orders DROP COLUMN tracking_number;");
        $this->execute("ALTER TABLE orders DROP COLUMN carrier;");
    }
}
