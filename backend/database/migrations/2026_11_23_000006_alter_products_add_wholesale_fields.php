<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// B2B Phase 2, step 1: the dealer price lives on the product itself (one catalogue).
// NULL is allowed only so existing products survive the migration; ProductService
// requires a value on every create and update, which drives the backfill. Once no NULL
// rows remain, a later migration makes the column NOT NULL (see IMPLEMENTATION_PLAN.md).
class AlterProductsAddWholesaleFields extends Migration
{
    public function up(): void
    {
        $this->execute("
            ALTER TABLE products
                ADD COLUMN wholesale_price   DECIMAL(10,2) NULL AFTER price,
                ADD COLUMN wholesale_min_qty INT UNSIGNED NULL AFTER wholesale_price,
                ADD INDEX idx_products_wholesale_price (wholesale_price);
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE products
                DROP INDEX idx_products_wholesale_price,
                DROP COLUMN wholesale_min_qty,
                DROP COLUMN wholesale_price;
        ");
    }
}
