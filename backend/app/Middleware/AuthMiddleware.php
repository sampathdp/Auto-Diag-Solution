<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Core\Auth\JWTService;
use Exception;

class AuthMiddleware
{
    private JWTService $jwtService;

    public function __construct()
    {
        $this->jwtService = new JWTService();
    }

    public function handle(Request $request): void
    {
        // Prefer Authorization header (Postman, mobile, server-to-server).
        // Fall back to HttpOnly cookie (browser sessions).
        $token = $this->extractToken($request);

        if (!$token) {
            Response::error('Unauthorized: authentication required', null, 401);
        }

        try {
            $decoded = $this->jwtService->validateToken($token);

            $request->user = (object) [
                'id'                   => $decoded->sub,
                'salon_id'             => $decoded->salon_id,
                'salon_slug'           => $decoded->salon_slug ?? null,
                'role'                 => $decoded->role,
                'branch_id'            => $decoded->branch_id ?? null,
                'needs_password_change' => $decoded->needs_password_change ?? false,
                'permissions'          => (array)($decoded->permissions ?? []),
            ];
        } catch (Exception $e) {
            Response::error('Unauthorized: ' . $e->getMessage(), null, 401);
        }
    }

    private function extractToken(Request $request): ?string
    {
        // 1. Authorization: Bearer <token>
        $authHeader = $request->getHeader('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            return $token !== '' ? $token : null;
        }

        // 2. HttpOnly cookie set by the backend on login/refresh
        if (!empty($_COOKIE['access_token'])) {
            return $_COOKIE['access_token'];
        }

        return null;
    }
}
