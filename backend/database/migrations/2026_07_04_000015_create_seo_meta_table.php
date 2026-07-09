<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateSeoMetaTable extends Migration
{
    public function up(): void
    {
        // path covers static/custom routes (e.g. the homepage) that have no owning row;
        // page_type + reference_id covers SEO overrides tied to a specific page/category/product.
        $this->execute("
            CREATE TABLE IF NOT EXISTS seo_meta (
                id                   BIGINT PRIMARY KEY AUTO_INCREMENT,
                page_type            ENUM('page','category','product','custom') NOT NULL DEFAULT 'custom',
                reference_id         BIGINT NULL,
                path                 VARCHAR(255) NULL,
                meta_title_en        VARCHAR(255) NULL,
                meta_title_ar        VARCHAR(255) NULL,
                meta_description_en  VARCHAR(500) NULL,
                meta_description_ar  VARCHAR(500) NULL,
                og_image             VARCHAR(500) NULL,
                created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_seo_meta_path (path),
                INDEX idx_seo_meta_type_ref (page_type, reference_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS seo_meta;");
    }
}
