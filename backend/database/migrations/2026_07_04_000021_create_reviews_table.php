<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateReviewsTable extends Migration
{
    public function up(): void
    {
        // is_approved defaults to false — reviews are moderated before showing publicly,
        // consistent with this being a fully admin-controlled CMS-style site.
        $this->execute("
            CREATE TABLE IF NOT EXISTS reviews (
                id           BIGINT PRIMARY KEY AUTO_INCREMENT,
                product_id   BIGINT NOT NULL,
                user_id      BIGINT NOT NULL,
                order_id     BIGINT NULL,
                rating       TINYINT UNSIGNED NOT NULL,
                title        VARCHAR(255) NULL,
                comment      TEXT NULL,
                is_approved  TINYINT(1) NOT NULL DEFAULT 0,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_reviews_product_user (product_id, user_id),
                INDEX idx_reviews_user_id (user_id),
                CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS reviews;");
    }
}
