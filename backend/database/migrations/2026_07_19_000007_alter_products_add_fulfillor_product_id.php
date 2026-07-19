<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterProductsAddFulfillorProductId extends Migration
{
    public function up(): void
    {
        // Manual mapping to Fulfillor's own productId until a real product sync exists —
        // required for FulfillmentService to build order line items Fulfillor recognizes.
        $this->execute("ALTER TABLE products ADD COLUMN fulfillor_product_id VARCHAR(100) NULL AFTER sku;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE products DROP COLUMN fulfillor_product_id;");
    }
}
