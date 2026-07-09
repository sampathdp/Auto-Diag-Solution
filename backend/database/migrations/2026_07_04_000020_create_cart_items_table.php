<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateCartItemsTable extends Migration
{
    public function up(): void
    {
        // price_at_add lets the storefront flag "price changed since you added this"
        // without needing an order to exist yet; the live price still comes from products.
        $this->execute("
            CREATE TABLE IF NOT EXISTS cart_items (
                id            BIGINT PRIMARY KEY AUTO_INCREMENT,
                cart_id       BIGINT NOT NULL,
                product_id    BIGINT NOT NULL,
                quantity      INT NOT NULL DEFAULT 1,
                price_at_add  DECIMAL(10,2) NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_cart_items_cart_product (cart_id, product_id),
                INDEX idx_cart_items_product_id (product_id),
                FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS cart_items;");
    }
}
