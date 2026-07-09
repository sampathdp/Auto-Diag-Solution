<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreatePagesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS pages (
                id            BIGINT PRIMARY KEY AUTO_INCREMENT,
                slug          VARCHAR(255) NOT NULL,
                title_en      VARCHAR(255) NOT NULL,
                title_ar      VARCHAR(255) NOT NULL,
                content_en    LONGTEXT NULL,
                content_ar    LONGTEXT NULL,
                is_published  TINYINT(1) NOT NULL DEFAULT 1,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_pages_slug (slug)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS pages;");
    }
}
