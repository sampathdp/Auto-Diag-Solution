<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateCartsTable extends Migration
{
    public function up(): void
    {
        // user_id is null for a guest cart (identified by session_token instead);
        // once a guest logs in, the app layer should merge their session cart into
        // the user's cart and null out session_token.
        $this->execute("
            CREATE TABLE IF NOT EXISTS carts (
                id             BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id        BIGINT NULL,
                session_token  VARCHAR(255) NULL,
                status         ENUM('active','converted','abandoned') NOT NULL DEFAULT 'active',
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_carts_session_token (session_token),
                INDEX idx_carts_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS carts;");
    }
}
