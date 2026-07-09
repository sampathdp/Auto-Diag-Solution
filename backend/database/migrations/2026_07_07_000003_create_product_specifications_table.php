<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Bilingual key/value spec rows shown on a product page (e.g. Voltage: 12V,
// Material: Ceramic, OEM Number: 04465-YZZAA) — matches the admin panel's
// existing "specifications" field on Product.
class CreateProductSpecificationsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS product_specifications (
                id          BIGINT PRIMARY KEY AUTO_INCREMENT,
                product_id  BIGINT NOT NULL,
                key_en      VARCHAR(150) NOT NULL,
                key_ar      VARCHAR(150) NOT NULL,
                value_en    VARCHAR(500) NOT NULL,
                value_ar    VARCHAR(500) NOT NULL,
                sort_order  INT NOT NULL DEFAULT 0,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_product_specifications_product_sort (product_id, sort_order),
                CONSTRAINT fk_product_specifications_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS product_specifications;");
    }
}
