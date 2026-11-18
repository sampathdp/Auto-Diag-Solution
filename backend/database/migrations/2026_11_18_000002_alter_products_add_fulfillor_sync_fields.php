<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Products now auto-sync to Fulfillor on create/edit (FulfillmentService::syncProduct).
// The push is best-effort — a failure never blocks saving the product — so the last
// result is recorded here for the admin product form to show.
class AlterProductsAddFulfillorSyncFields extends Migration
{
    public function up(): void
    {
        $this->execute("
            ALTER TABLE products
                ADD COLUMN fulfillor_synced_at  TIMESTAMP NULL DEFAULT NULL AFTER fulfillor_product_id,
                ADD COLUMN fulfillor_sync_error TEXT NULL AFTER fulfillor_synced_at;
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE products
                DROP COLUMN fulfillor_synced_at,
                DROP COLUMN fulfillor_sync_error;
        ");
    }
}
