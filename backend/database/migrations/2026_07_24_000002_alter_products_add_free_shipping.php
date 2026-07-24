<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Lets admins mark a product as qualifying for free shipping, independent of
// weight/fulfillment logic — surfaced to shoppers as a storefront badge.
class AlterProductsAddFreeShipping extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE products ADD COLUMN free_shipping TINYINT(1) NOT NULL DEFAULT 0 AFTER fits_all_vehicles;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE products DROP COLUMN free_shipping;");
    }
}
