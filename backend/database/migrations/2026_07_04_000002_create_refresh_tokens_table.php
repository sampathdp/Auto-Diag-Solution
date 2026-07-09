<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateRefreshTokensTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id          BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id     BIGINT NOT NULL,
                token       VARCHAR(255) NOT NULL,
                is_revoked  TINYINT(1) NOT NULL DEFAULT 0,
                expires_at  TIMESTAMP NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_refresh_tokens_token (token),
                INDEX idx_refresh_tokens_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS refresh_tokens;");
    }
}
