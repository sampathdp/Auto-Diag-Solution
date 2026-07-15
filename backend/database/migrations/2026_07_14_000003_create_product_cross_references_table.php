<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateProductCrossReferencesTable extends Migration
{
    public function up(): void
    {
        // Cross-reference / interchange numbers — other OEM or competitor part numbers
        // that this same physical product matches. One product can have many; the
        // index on cross_number supports a future "search by part number" lookup.
        $this->execute("
            CREATE TABLE IF NOT EXISTS product_cross_references (
                id           BIGINT PRIMARY KEY AUTO_INCREMENT,
                product_id   BIGINT NOT NULL,
                cross_number VARCHAR(100) NOT NULL,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_product_cross_references_product_id (product_id),
                INDEX idx_product_cross_references_cross_number (cross_number),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS product_cross_references;");
    }
}
