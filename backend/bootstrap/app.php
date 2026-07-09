<?php

declare(strict_types=1);

use App\Core\Router\Router;

// Global configurations
date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'Asia/Colombo');

// ── Production safety guard ─────────────────────────────────────────────────────
// A misconfigured deploy (debug mode left on, or the placeholder JWT secret never
// rotated) would defeat "never leak internals to users" and "tokens are unforgeable"
// in one bad .env. Refuse to boot rather than silently running unsafely in prod.
const UNSAFE_JWT_SECRET_PLACEHOLDER = 'super-secret-key-change-this-in-production';

if (($_ENV['APP_ENV'] ?? 'local') === 'production') {
    $unsafeReasons = [];

    if (($_ENV['APP_DEBUG'] ?? 'false') === 'true') {
        $unsafeReasons[] = 'APP_DEBUG is true';
    }

    $jwtSecret = $_ENV['JWT_SECRET'] ?? '';
    if ($jwtSecret === '' || $jwtSecret === UNSAFE_JWT_SECRET_PLACEHOLDER || strlen($jwtSecret) < 32) {
        $unsafeReasons[] = 'JWT_SECRET is missing, still the placeholder value, or too short';
    }

    // APP_ENCRYPTION_KEY protects at-rest secrets (e.g. suppliers.api_key) — same
    // "refuse to boot rather than run unsafely" reasoning as JWT_SECRET above.
    $encryptionKey = $_ENV['APP_ENCRYPTION_KEY'] ?? '';
    $decodedKeyLength = $encryptionKey !== '' ? strlen((string) base64_decode($encryptionKey, true)) : 0;
    if ($encryptionKey === '' || $decodedKeyLength !== 32) {
        $unsafeReasons[] = 'APP_ENCRYPTION_KEY is missing or not a valid base64-encoded 32-byte key';
    }

    if (!empty($unsafeReasons)) {
        $logDir = __DIR__ . '/../scratch';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        file_put_contents(
            $logDir . '/errors.log',
            sprintf("[%s] BOOT REFUSED — unsafe production config: %s\n", date('Y-m-d H:i:s'), implode('; ', $unsafeReasons)),
            FILE_APPEND
        );

        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'data' => null,
            'error' => null,
            'message' => 'Service temporarily unavailable',
        ]);
        exit;
    }
}
// ─────────────────────────────────────────────────────────────────────────────────

// Initialize Router
$router = new Router();

// Load Routes
require_once __DIR__ . '/../routes/api.php';

return $router;
