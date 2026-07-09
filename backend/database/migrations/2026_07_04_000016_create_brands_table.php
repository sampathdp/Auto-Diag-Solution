<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateBrandsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS brands (
                id             BIGINT PRIMARY KEY AUTO_INCREMENT,
                name_en        VARCHAR(150) NOT NULL,
                name_ar        VARCHAR(150) NOT NULL,
                slug           VARCHAR(150) NOT NULL,
                logo           VARCHAR(500) NULL,
                description_en TEXT NULL,
                description_ar TEXT NULL,
                is_active      TINYINT(1) NOT NULL DEFAULT 1,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_brands_slug (slug)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS brands;");
    }
}
