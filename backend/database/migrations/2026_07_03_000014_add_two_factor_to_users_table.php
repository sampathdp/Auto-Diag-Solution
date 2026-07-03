<?php

use App\Core\Database\DatabaseManager;

class AddTwoFactorToUsersTable
{
    public function up(): void
    {
        $this->addColumnIfMissing('users', 'two_factor_secret', 'VARCHAR(64) NULL');
        $this->addColumnIfMissing('users', 'two_factor_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
        $this->addColumnIfMissing('users', 'two_factor_confirmed_at', 'TIMESTAMP NULL');

        DatabaseManager::query("
            CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id BIGINT NOT NULL,
                code_hash VARCHAR(255) NOT NULL,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE users DROP COLUMN IF EXISTS two_factor_secret");
        $this->execute("ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled");
        $this->execute("ALTER TABLE users DROP COLUMN IF EXISTS two_factor_confirmed_at");
        $this->execute("DROP TABLE IF EXISTS two_factor_recovery_codes");
    }

    private function execute(string $sql): void
    {
        DatabaseManager::query($sql, []);
    }

    // "ADD COLUMN IF NOT EXISTS" is MariaDB-only syntax; MySQL rejects it,
    // so column existence is checked via information_schema for portability.
    private function addColumnIfMissing(string $table, string $column, string $definition): void
    {
        $exists = DatabaseManager::query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column",
            ['table' => $table, 'column' => $column]
        )->fetchColumn();

        if (!$exists) {
            DatabaseManager::query("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
        }
    }
}
