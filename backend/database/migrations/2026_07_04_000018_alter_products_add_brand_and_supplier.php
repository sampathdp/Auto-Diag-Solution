<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterProductsAddBrandAndSupplier extends Migration
{
    public function up(): void
    {
        // Replaces the free-text `brand` column with a real brands table (bilingual,
        // filterable). supplier_id identifies *which* 3PL account a product came from;
        // source_supplier_id (already on this table) remains that supplier's own product
        // reference/SKU for the item — the two are different things.
        $this->execute("
            ALTER TABLE products
                ADD COLUMN brand_id BIGINT NULL AFTER category_id,
                ADD COLUMN supplier_id BIGINT NULL AFTER source,
                DROP COLUMN brand,
                ADD INDEX idx_products_brand_id (brand_id),
                ADD INDEX idx_products_supplier_id (supplier_id),
                ADD CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
                ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE products
                DROP FOREIGN KEY fk_products_brand,
                DROP FOREIGN KEY fk_products_supplier,
                DROP INDEX idx_products_brand_id,
                DROP INDEX idx_products_supplier_id,
                DROP COLUMN brand_id,
                DROP COLUMN supplier_id,
                ADD COLUMN brand VARCHAR(150) NULL AFTER short_description_ar;
        ");
    }
}
