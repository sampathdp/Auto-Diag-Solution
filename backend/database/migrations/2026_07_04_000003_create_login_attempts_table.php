<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateLoginAttemptsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS login_attempts (
                email           VARCHAR(255) PRIMARY KEY,
                attempts        INT NOT NULL DEFAULT 0,
                last_attempt_at TIMESTAMP NULL,
                locked_until    TIMESTAMP NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS login_attempts;");
    }
}
