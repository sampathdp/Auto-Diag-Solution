<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Auth\TOTP;
use App\Core\Database\DatabaseManager;

class TwoFactorService
{
    private const RECOVERY_CODE_COUNT = 8;

    private static bool $schemaReady = false;

    public static function ensureSchema(): void
    {
        if (self::$schemaReady) {
            return;
        }

        try {
            self::addColumnIfMissing('users', 'two_factor_secret', 'VARCHAR(64) NULL');
            self::addColumnIfMissing('users', 'two_factor_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
            self::addColumnIfMissing('users', 'two_factor_confirmed_at', 'TIMESTAMP NULL');
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
            self::$schemaReady = true;
        } catch (\Exception $e) {
            // Ignore — schema already applied
        }
    }

    // "ADD COLUMN IF NOT EXISTS" is MariaDB-only syntax; MySQL rejects it,
    // so column existence is checked via information_schema for portability.
    private static function addColumnIfMissing(string $table, string $column, string $definition): void
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

    public static function generateSetup(int $userId): array
    {
        self::ensureSchema();

        $secret = TOTP::generateSecret();
        $user = DatabaseManager::query(
            "SELECT email FROM users WHERE id = :id LIMIT 1",
            ['id' => $userId]
        )->fetch();

        DatabaseManager::query(
            "UPDATE users SET two_factor_secret = :secret, two_factor_enabled = 0, two_factor_confirmed_at = NULL WHERE id = :id",
            ['secret' => $secret, 'id' => $userId]
        );

        return [
            'secret' => $secret,
            'otpauth_uri' => TOTP::getUri($_ENV['APP_NAME'] ?? 'App', $user['email'] ?? 'account', $secret),
        ];
    }

    public static function confirmSetup(int $userId, string $code): ?array
    {
        self::ensureSchema();

        $row = DatabaseManager::query(
            "SELECT two_factor_secret FROM users WHERE id = :id LIMIT 1",
            ['id' => $userId]
        )->fetch();

        if (!$row || !$row['two_factor_secret'] || !TOTP::verify($row['two_factor_secret'], $code)) {
            return null;
        }

        DatabaseManager::query(
            "UPDATE users SET two_factor_enabled = 1, two_factor_confirmed_at = NOW() WHERE id = :id",
            ['id' => $userId]
        );

        return self::regenerateRecoveryCodes($userId);
    }

    public static function regenerateRecoveryCodes(int $userId): array
    {
        DatabaseManager::query("DELETE FROM two_factor_recovery_codes WHERE user_id = :id", ['id' => $userId]);

        $codes = [];
        for ($i = 0; $i < self::RECOVERY_CODE_COUNT; $i++) {
            $codes[] = strtolower(bin2hex(random_bytes(5)));
        }

        foreach ($codes as $code) {
            DatabaseManager::query(
                "INSERT INTO two_factor_recovery_codes (user_id, code_hash) VALUES (:user_id, :code_hash)",
                ['user_id' => $userId, 'code_hash' => password_hash($code, PASSWORD_BCRYPT)]
            );
        }

        return $codes;
    }

    public static function disable(int $userId): void
    {
        self::ensureSchema();
        DatabaseManager::query(
            "UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_confirmed_at = NULL WHERE id = :id",
            ['id' => $userId]
        );
        DatabaseManager::query("DELETE FROM two_factor_recovery_codes WHERE user_id = :id", ['id' => $userId]);
    }

    public static function verifyLoginCode(array $user, string $code): bool
    {
        self::ensureSchema();

        if (!empty($user['two_factor_secret']) && TOTP::verify($user['two_factor_secret'], $code)) {
            return true;
        }

        return self::consumeRecoveryCode((int) $user['id'], $code);
    }

    private static function consumeRecoveryCode(int $userId, string $code): bool
    {
        $code = strtolower(trim($code));
        $rows = DatabaseManager::query(
            "SELECT id, code_hash FROM two_factor_recovery_codes WHERE user_id = :id AND used_at IS NULL",
            ['id' => $userId]
        )->fetchAll();

        foreach ($rows as $row) {
            if (password_verify($code, $row['code_hash'])) {
                DatabaseManager::query(
                    "UPDATE two_factor_recovery_codes SET used_at = NOW() WHERE id = :id",
                    ['id' => $row['id']]
                );
                return true;
            }
        }

        return false;
    }
}
