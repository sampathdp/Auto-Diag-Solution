<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateOrderItemsTable extends Migration
{
    public function up(): void
    {
        // sku/name/unit_price are snapshotted at order time so a later price change or
        // product edit never rewrites history on a past invoice.
        $this->execute("
            CREATE TABLE IF NOT EXISTS order_items (
                id          BIGINT PRIMARY KEY AUTO_INCREMENT,
                order_id    BIGINT NOT NULL,
                product_id  BIGINT NULL,
                sku         VARCHAR(100) NOT NULL,
                name_en     VARCHAR(255) NOT NULL,
                name_ar     VARCHAR(255) NOT NULL,
                unit_price  DECIMAL(10,2) NOT NULL,
                quantity    INT NOT NULL DEFAULT 1,
                line_total  DECIMAL(10,2) NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_order_items_order_id (order_id),
                INDEX idx_order_items_product_id (product_id),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS order_items;");
    }
}
