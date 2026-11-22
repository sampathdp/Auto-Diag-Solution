<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/manual_autoload.php';

use App\Core\Request;
use App\Core\Response;
use App\Exceptions\DomainException;

// ── CORS & Security Headers ────────────────────────────────────────────────────
// Allowed frontend origin(s). In production set FRONTEND_URL in .env.
$isLocal = ($_ENV['APP_ENV'] ?? 'local') === 'local';

$frontendUrl = $_ENV['FRONTEND_URL'] ?? null;
$frontendUrlAlt = null;
if ($frontendUrl) {
    if (str_contains($frontendUrl, '://www.')) {
        $frontendUrlAlt = str_replace('://www.', '://', $frontendUrl);
    } elseif (str_contains($frontendUrl, '://')) {
        $frontendUrlAlt = str_replace('://', '://www.', $frontendUrl);
    }
}

$allowedOrigins = array_filter([
    $frontendUrl,
    $frontendUrlAlt,
    'http://localhost:3000',               // Next.js dev server
    'http://127.0.0.1:3000',
]);

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Next.js picks the next free port (3001, 3002, ...) whenever 3000 is taken,
// so in local dev accept any localhost/127.0.0.1 port instead of hardcoding one.
$isLocalOrigin = $isLocal && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $requestOrigin) === 1;

if (in_array($requestOrigin, $allowedOrigins, true) || $isLocalOrigin) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Vary: Origin');
} elseif ($isLocal && $requestOrigin === '') {
    // Same-origin or non-browser requests (Postman with no Origin) — allow in dev only
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept');
header('Access-Control-Max-Age: 3600');

// Security hardening headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Handle browser CORS preflight — must exit before any auth check
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- CSRF protection: verify Origin on state-changing requests ----------------
// Auth cookies are SameSite=None (required because the frontend and backend are
// different origins), so SameSite alone can't stop a cross-site <form> POST from
// carrying the cookie along. A legitimate browser call to this API is cross-site by
// construction and always sends Origin — reject state-changing requests whose Origin
// isn't one we already trust for CORS above. The Fulfillor webhook is exempt: it's a
// server-to-server call with no browser Origin header, guarded by its own shared
// secret instead (see FulfillorWebhookController).
$isStateChanging = in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'], true);
$isWebhookPath = str_ends_with(strtok($_SERVER['REQUEST_URI'] ?? '/', '?'), '/webhooks/fulfillor');

if ($isStateChanging && !$isWebhookPath) {
    $originIsTrusted = in_array($requestOrigin, $allowedOrigins, true)
        || $isLocalOrigin
        || ($isLocal && $requestOrigin === ''); // non-browser tools (Postman) in dev only

    if (!$originIsTrusted) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'data'    => null,
            'error'   => 'origin_not_allowed',
            'message' => 'Request origin not allowed.',
        ]);
        exit;
    }
}
// ──────────────────────────────────────────────────────────────────────────────

try {
    /** @var App\Core\Router\Router $router */
    $router = require_once __DIR__ . '/../bootstrap/app.php';

    $request = new Request();
    
    // Resolve the route
    $router->resolve($request);

} catch (DomainException $e) {
    // Known, user-safe failure (e.g. "Product out of stock") — message is intentionally shown as-is.
    Response::error(
        $e->getMessage(),
        $e instanceof App\Exceptions\ValidationException ? $e->errors() : null,
        $e->getStatusCode()
    );
} catch (\Throwable $e) {
    // Global Exception Handler — never expose internals in the API response.
    // Every other module (catalog, cart, payments, 3PL sync, ...) funnels its unexpected
    // failures through this single handler, so a bug in one feature can surface as a
    // clean generic error to the user without ever leaking internals — and without
    // taking any other feature down, since each HTTP request is independently handled.
    $debug = ($_ENV['APP_DEBUG'] ?? 'false') === 'true';

    // Always log the full trace server-side
    $logDir = __DIR__ . '/../scratch';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    file_put_contents(
        $logDir . '/errors.log',
        sprintf(
            "[%s] %s in %s:%d\n%s\n---\n",
            date('Y-m-d H:i:s'),
            $e->getMessage(),
            $e->getFile(),
            $e->getLine(),
            $e->getTraceAsString()
        ),
        FILE_APPEND
    );

    Response::error(
        $debug ? $e->getMessage() : 'An internal error occurred',
        null,
        500
    );
}
