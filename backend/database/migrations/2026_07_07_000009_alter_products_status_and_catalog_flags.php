<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Aligns the products table with the admin panel's already-built data model:
// - `status` replaces the boolean `is_active` (admin needs draft/active/inactive,
//   e.g. a product being prepared vs. one taken off sale vs. one live).
// - `fits_all_vehicles` lets a universal part skip fitment filtering entirely
//   instead of requiring a product_vehicle row per vehicle in the catalog.
// - `low_stock_threshold` / `track_inventory` back the admin low-stock dashboard tile.
// - `vat_inclusive` — UAE storefronts commonly display VAT-inclusive prices; this
//   flag tells checkout math whether `price` already includes the 5% VAT or not.
// products has 0 rows at the time of this migration, so no data backfill is needed.
class AlterProductsStatusAndCatalogFlags extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE products ADD COLUMN status ENUM('draft','active','inactive') NOT NULL DEFAULT 'draft' AFTER source_synced_at;");
        $this->execute("ALTER TABLE products ADD COLUMN fits_all_vehicles TINYINT(1) NOT NULL DEFAULT 0 AFTER status;");
        $this->execute("ALTER TABLE products ADD COLUMN low_stock_threshold INT NULL AFTER stock_quantity;");
        $this->execute("ALTER TABLE products ADD COLUMN track_inventory TINYINT(1) NOT NULL DEFAULT 1 AFTER low_stock_threshold;");
        $this->execute("ALTER TABLE products ADD COLUMN vat_inclusive TINYINT(1) NOT NULL DEFAULT 1 AFTER price;");
        $this->execute("ALTER TABLE products DROP COLUMN is_active;");

        // idx_products_category_id's leftmost column (category_id) already covers a
        // plain category filter, so folding status into the same composite index (rather
        // than adding a third separate index) also covers the hot "products in category X
        // where status = active" storefront query without extra write overhead. The new
        // composite is added *before* dropping the old single-column index so the FK on
        // category_id always has a supporting index (MySQL refuses to drop the only index
        // backing a foreign key).
        $this->execute("ALTER TABLE products ADD INDEX idx_products_category_status (category_id, status);");
        $this->execute("ALTER TABLE products DROP INDEX idx_products_category_id;");
        // Cross-category admin listing by status alone (e.g. "all draft products").
        $this->execute("ALTER TABLE products ADD INDEX idx_products_status (status);");
        // Price sort/range-filter support for storefront catalog browsing.
        $this->execute("ALTER TABLE products ADD INDEX idx_products_price (price);");
        // Admin stock views: out-of-stock/backorder filters and low-stock sort.
        $this->execute("ALTER TABLE products ADD INDEX idx_products_stock_status (stock_status);");
        $this->execute("ALTER TABLE products ADD INDEX idx_products_stock_quantity (stock_quantity);");
        // Bilingual product search (storefront search bar + admin product search) —
        // avoids a leading-wildcard LIKE '%...%' table scan.
        $this->execute("ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name_en, name_ar, short_description_en, short_description_ar);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE products DROP INDEX ft_products_search;");
        $this->execute("ALTER TABLE products DROP INDEX idx_products_stock_quantity;");
        $this->execute("ALTER TABLE products DROP INDEX idx_products_stock_status;");
        $this->execute("ALTER TABLE products DROP INDEX idx_products_price;");
        $this->execute("ALTER TABLE products DROP INDEX idx_products_status;");
        $this->execute("ALTER TABLE products ADD INDEX idx_products_category_id (category_id);");
        $this->execute("ALTER TABLE products DROP INDEX idx_products_category_status;");

        $this->execute("ALTER TABLE products ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;");
        $this->execute("ALTER TABLE products DROP COLUMN vat_inclusive;");
        $this->execute("ALTER TABLE products DROP COLUMN track_inventory;");
        $this->execute("ALTER TABLE products DROP COLUMN low_stock_threshold;");
        $this->execute("ALTER TABLE products DROP COLUMN fits_all_vehicles;");
        $this->execute("ALTER TABLE products DROP COLUMN status;");
    }
}
