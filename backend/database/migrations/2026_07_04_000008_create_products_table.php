<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateProductsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS products (
                id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
                category_id           BIGINT NULL,
                sku                   VARCHAR(100) NOT NULL,
                name_en               VARCHAR(255) NOT NULL,
                name_ar               VARCHAR(255) NOT NULL,
                slug                  VARCHAR(255) NOT NULL,
                description_en        TEXT NULL,
                description_ar        TEXT NULL,
                short_description_en  VARCHAR(500) NULL,
                short_description_ar  VARCHAR(500) NULL,
                brand                 VARCHAR(150) NULL,
                price                 DECIMAL(10,2) NOT NULL DEFAULT 0,
                compare_at_price      DECIMAL(10,2) NULL,
                cost_price            DECIMAL(10,2) NULL,
                stock_quantity        INT NOT NULL DEFAULT 0,
                stock_status          ENUM('in_stock','out_of_stock','backorder') NOT NULL DEFAULT 'in_stock',
                images                JSON NULL,
                weight_kg             DECIMAL(8,3) NULL,
                source                ENUM('local','3pl') NOT NULL DEFAULT 'local',
                source_supplier_id    VARCHAR(150) NULL,
                source_synced_at      TIMESTAMP NULL,
                is_active             TINYINT(1) NOT NULL DEFAULT 1,
                created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_products_sku (sku),
                UNIQUE KEY uq_products_slug (slug),
                INDEX idx_products_category_id (category_id),
                INDEX idx_products_source (source),
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS products;");
    }
}
