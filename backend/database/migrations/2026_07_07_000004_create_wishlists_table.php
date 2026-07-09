<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateWishlistsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS wishlists (
                id          BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id     BIGINT NOT NULL,
                product_id  BIGINT NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_wishlists_user_product (user_id, product_id),
                INDEX idx_wishlists_product_id (product_id),
                CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_wishlists_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS wishlists;");
    }
}
