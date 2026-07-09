<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateSettingsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS settings (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                `key`      VARCHAR(150) NOT NULL,
                value      TEXT NULL,
                type       ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
                group_name VARCHAR(100) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_settings_key (`key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS settings;");
    }
}
