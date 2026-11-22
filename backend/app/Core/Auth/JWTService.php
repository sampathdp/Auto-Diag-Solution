<?php

declare(strict_types=1);

namespace App\Core\Auth;

use App\Core\Auth\SimpleJWT as JWT;
use App\Core\Database\DatabaseManager;
use Exception;

class JWTService
{
    private string $secret;
    private string $algo;
    private int $accessExpiry;
    private int $refreshExpiry;

    public function __construct()
    {
        if (empty($_ENV['JWT_SECRET'])) {
            throw new \RuntimeException('JWT_SECRET environment variable is not configured.');
        }
        $this->secret = $_ENV['JWT_SECRET'];
        $this->algo = $_ENV['JWT_ALGO'] ?? 'HS256';
        $this->accessExpiry = (int) ($_ENV['JWT_ACCESS_EXPIRY'] ?? 900); // 15 mins
        $this->refreshExpiry = (int) ($_ENV['JWT_REFRESH_EXPIRY'] ?? 604800); // 7 days
    }

    public function generateAccessToken(array $user): string
    {
        $permissions = $this->getUserPermissions((int)$user['id'], $user['role']);

        $payload = [
            'iss' => $_ENV['APP_URL'] ?? 'localhost',
            'iat' => time(),
            'exp' => time() + $this->accessExpiry,
            'sub' => $user['id'],
            'role' => $user['role'],
            'permissions' => $permissions,
            'needs_password_change' => isset($user['needs_password_change']) && (int)$user['needs_password_change'] === 1,
            'type' => 'access'
        ];

        return JWT::encode($payload, $this->secret);
    }

    /**
     * Resolve a user's permission strings for embedding in the JWT.
     * The claim is informational (the frontend uses it to hide controls). Authorization
     * never trusts it: PermissionMiddleware re-reads permissions from the database.
     */
    private function getUserPermissions(int $userId, string $role): array
    {
        if ($role !== 'admin') {
            return [];
        }

        return (new \App\Services\PermissionService())->forUser($userId);
    }

    public function generateRefreshToken(int $userId): string
    {
        $token = bin2hex(random_bytes(64));
        $expiresAt = date('Y-m-d H:i:s', time() + $this->refreshExpiry);

        $sql = "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (:user_id, :token, :expires_at)";
        DatabaseManager::query($sql, [
            'user_id' => $userId,
            'token' => $token,
            'expires_at' => $expiresAt
        ]);

        return $token;
    }

    public function getAccessExpiry(): int
    {
        return $this->accessExpiry;
    }

    public function getRefreshExpiry(): int
    {
        return $this->refreshExpiry;
    }

    public function validateToken(string $token): object
    {
        try {
            return (object) JWT::decode($token, $this->secret);
        } catch (Exception $e) {
            throw new Exception("Invalid or expired token");
        }
    }

    public function revokeRefreshToken(string $token): void
    {
        $sql = "UPDATE refresh_tokens SET is_revoked = 1 WHERE token = :token";
        DatabaseManager::query($sql, ['token' => $token]);
    }
}
