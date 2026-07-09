<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// A shared media library: products.images (JSON) stores an array of media.id
// references into this table rather than raw upload paths, so an asset can be
// reused across products and tracked (uploader, alt text) from one place —
// matching the admin panel's existing MediaItem concept.
class CreateMediaTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS media (
                id                BIGINT PRIMARY KEY AUTO_INCREMENT,
                path              VARCHAR(500) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                mime_type         VARCHAR(100) NOT NULL,
                size_bytes        INT UNSIGNED NOT NULL,
                alt_text_en       VARCHAR(255) NULL,
                alt_text_ar       VARCHAR(255) NULL,
                uploaded_by       BIGINT NULL,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_media_uploaded_by (uploaded_by),
                CONSTRAINT fk_media_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS media;");
    }
}
