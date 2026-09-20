<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateHomePageTable extends Migration
{
    public function up(): void
    {
        // Singleton table (always exactly one row) backing the storefront home page.
        // All bilingual copy for the hero, stats, about band, section headings, brands,
        // why-us grid and CTA band lives in one JSON document (see HomePageService for
        // the accepted shape) so admins can edit it without touching translation files.
        $this->execute("
            CREATE TABLE IF NOT EXISTS home_page (
                id           BIGINT PRIMARY KEY AUTO_INCREMENT,
                content_json JSON NOT NULL,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS home_page;");
    }
}
