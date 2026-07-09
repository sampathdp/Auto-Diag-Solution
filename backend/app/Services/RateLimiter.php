<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;

/**
 * Generic sliding-lockout rate limiter keyed by (action, identifier).
 * identifier is caller-chosen — an email, an IP address, or "ip:email" —
 * so the same mechanism covers login-by-email, login-by-IP, registration-by-IP, etc.
 */
class RateLimiter
{
    private static bool $tableReady = false;

    private static function ensureTable(): void
    {
        if (self::$tableReady) {
            return;
        }

        try {
            DatabaseManager::query("
                CREATE TABLE IF NOT EXISTS rate_limits (
                    action          VARCHAR(64) NOT NULL,
                    identifier      VARCHAR(191) NOT NULL,
                    attempts        INT NOT NULL DEFAULT 0,
                    last_attempt_at TIMESTAMP NULL,
                    locked_until    TIMESTAMP NULL,
                    PRIMARY KEY (action, identifier)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
            self::$tableReady = true;
        } catch (\Exception $e) {
            // Ignore — table likely already exists
        }
    }

    /**
     * Seconds remaining until (action, identifier) is unlocked. 0 means not locked.
     */
    public static function secondsUntilUnlocked(string $action, string $identifier): int
    {
        self::ensureTable();

        $row = DatabaseManager::query(
            "SELECT locked_until FROM rate_limits WHERE action = :action AND identifier = :identifier LIMIT 1",
            ['action' => $action, 'identifier' => $identifier]
        )->fetch();

        if (!$row || !$row['locked_until']) {
            return 0;
        }

        return max(0, strtotime($row['locked_until']) - time());
    }

    /**
     * Record a failed attempt; locks the (action, identifier) pair once $maxAttempts is reached.
     */
    public static function hit(string $action, string $identifier, int $maxAttempts, int $lockoutSeconds): void
    {
        self::ensureTable();

        $row = DatabaseManager::query(
            "SELECT attempts FROM rate_limits WHERE action = :action AND identifier = :identifier LIMIT 1",
            ['action' => $action, 'identifier' => $identifier]
        )->fetch();

        $attempts = ($row ? (int)$row['attempts'] : 0) + 1;
        $lockedUntil = $attempts >= $maxAttempts
            ? date('Y-m-d H:i:s', time() + $lockoutSeconds)
            : null;

        DatabaseManager::query(
            "INSERT INTO rate_limits (action, identifier, attempts, last_attempt_at, locked_until)
             VALUES (:action, :identifier, :attempts, NOW(), :locked_until)
             ON DUPLICATE KEY UPDATE attempts = :attempts2, last_attempt_at = NOW(), locked_until = :locked_until2",
            [
                'action' => $action,
                'identifier' => $identifier,
                'attempts' => $attempts,
                'locked_until' => $lockedUntil,
                'attempts2' => $attempts,
                'locked_until2' => $lockedUntil,
            ]
        );
    }

    public static function clear(string $action, string $identifier): void
    {
        self::ensureTable();

        DatabaseManager::query(
            "DELETE FROM rate_limits WHERE action = :action AND identifier = :identifier",
            ['action' => $action, 'identifier' => $identifier]
        );
    }
}
