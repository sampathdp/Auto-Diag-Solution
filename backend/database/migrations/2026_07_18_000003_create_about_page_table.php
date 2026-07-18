<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateAboutPageTable extends Migration
{
    public function up(): void
    {
        // Singleton table (always exactly one row, id = 1) backing the storefront
        // About Us page — every visible piece of copy in that page's hero, story,
        // values grid, and milestones timeline is a column or JSON field here so
        // admins can edit it without touching code/translation files.
        $this->execute("
            CREATE TABLE IF NOT EXISTS about_page (
                id                   BIGINT PRIMARY KEY AUTO_INCREMENT,
                hero_eyebrow_en      VARCHAR(255) NOT NULL DEFAULT '',
                hero_eyebrow_ar      VARCHAR(255) NOT NULL DEFAULT '',
                hero_title_en        VARCHAR(255) NOT NULL DEFAULT '',
                hero_title_ar        VARCHAR(255) NOT NULL DEFAULT '',
                hero_subtitle_en     TEXT NULL,
                hero_subtitle_ar     TEXT NULL,
                hero_crumb_en        VARCHAR(255) NOT NULL DEFAULT '',
                hero_crumb_ar        VARCHAR(255) NOT NULL DEFAULT '',
                story_eyebrow_en     VARCHAR(255) NOT NULL DEFAULT '',
                story_eyebrow_ar     VARCHAR(255) NOT NULL DEFAULT '',
                story_title_en       VARCHAR(255) NOT NULL DEFAULT '',
                story_title_ar       VARCHAR(255) NOT NULL DEFAULT '',
                story_body1_en       TEXT NULL,
                story_body1_ar       TEXT NULL,
                story_body2_en       TEXT NULL,
                story_body2_ar       TEXT NULL,
                story_image_tag_en   VARCHAR(255) NOT NULL DEFAULT '',
                story_image_tag_ar   VARCHAR(255) NOT NULL DEFAULT '',
                values_eyebrow_en    VARCHAR(255) NOT NULL DEFAULT '',
                values_eyebrow_ar    VARCHAR(255) NOT NULL DEFAULT '',
                values_title_en      VARCHAR(255) NOT NULL DEFAULT '',
                values_title_ar      VARCHAR(255) NOT NULL DEFAULT '',
                values_json          JSON NOT NULL,
                timeline_eyebrow_en  VARCHAR(255) NOT NULL DEFAULT '',
                timeline_eyebrow_ar  VARCHAR(255) NOT NULL DEFAULT '',
                timeline_title_en    VARCHAR(255) NOT NULL DEFAULT '',
                timeline_title_ar    VARCHAR(255) NOT NULL DEFAULT '',
                milestones_json      JSON NOT NULL,
                created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS about_page;");
    }
}
