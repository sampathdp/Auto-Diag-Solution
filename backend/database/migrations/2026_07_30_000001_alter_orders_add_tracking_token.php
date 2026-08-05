<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterOrdersAddTrackingToken extends Migration
{
    public function up(): void
    {
        // Lets the order-confirmation email link to a status page without requiring the
        // customer to be logged in (guest checkout has no password/session to authenticate
        // with). Only the hash is stored — same reasoning as password_reset_tokens — so a
        // database leak alone can't be used to view someone else's order.
        $this->execute("
            ALTER TABLE orders
                ADD COLUMN tracking_token_hash VARCHAR(255) NULL AFTER order_number,
                ADD UNIQUE KEY uq_orders_tracking_token_hash (tracking_token_hash);
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE orders
                DROP INDEX uq_orders_tracking_token_hash,
                DROP COLUMN tracking_token_hash;
        ");
    }
}
