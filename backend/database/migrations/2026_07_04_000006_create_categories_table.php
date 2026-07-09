<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateCategoriesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS categories (
                id              BIGINT PRIMARY KEY AUTO_INCREMENT,
                parent_id       BIGINT NULL,
                name_en         VARCHAR(255) NOT NULL,
                name_ar         VARCHAR(255) NOT NULL,
                slug            VARCHAR(255) NOT NULL,
                description_en  TEXT NULL,
                description_ar  TEXT NULL,
                image           VARCHAR(500) NULL,
                sort_order      INT NOT NULL DEFAULT 0,
                is_active       TINYINT(1) NOT NULL DEFAULT 1,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_categories_slug (slug),
                INDEX idx_categories_parent_id (parent_id),
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS categories;");
    }
}
