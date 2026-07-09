<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateTwoFactorRecoveryCodesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id    BIGINT NOT NULL,
                code_hash  VARCHAR(255) NOT NULL,
                used_at    TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_two_factor_recovery_codes_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS two_factor_recovery_codes;");
    }
}
