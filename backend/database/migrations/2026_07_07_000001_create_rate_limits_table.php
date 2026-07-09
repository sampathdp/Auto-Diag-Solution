<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateRateLimitsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS rate_limits (
                action          VARCHAR(64) NOT NULL,
                identifier      VARCHAR(191) NOT NULL,
                attempts        INT NOT NULL DEFAULT 0,
                last_attempt_at TIMESTAMP NULL,
                locked_until    TIMESTAMP NULL,
                PRIMARY KEY (action, identifier)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS rate_limits;");
    }
}
