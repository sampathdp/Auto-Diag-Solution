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
            'salon_id' => $user['salon_id'],
            'salon_slug' => $user['salon_slug'] ?? null,
            'branch_id' => isset($user['branch_id']) && $user['branch_id'] !== null ? (int)$user['branch_id'] : null,
            'role' => $user['role'],
            'permissions' => $permissions,
            'needs_password_change' => isset($user['needs_password_change']) && (int)$user['needs_password_change'] === 1,
            'type' => 'access'
        ];

        return JWT::encode($payload, $this->secret);
    }

    private function getUserPermissions(int $userId, string $role): array
    {
        // 1. Super Admin always has full access
        if ($role === 'super_admin') {
            return ['*'];
        }

        // 2. For staff role: check for individual permission overrides first
        if ($role === 'staff') {
            $staffPerms = DatabaseManager::query(
                "SELECT staff_permissions FROM users WHERE id = :id LIMIT 1",
                ['id' => $userId]
            )->fetchColumn();

            if ($staffPerms !== false && $staffPerms !== null) {
                $decoded = json_decode($staffPerms, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        // 3. Fetch User's Salon and Active Subscription
        $sql = "SELECT s.id as salon_id, s.custom_permissions,
                       sub.status as sub_status, sub.expires_at, sub.plan_id, sp.permissions as plan_permissions
                FROM users u
                JOIN salons s ON u.salon_id = s.id
                LEFT JOIN subscriptions sub ON s.id = sub.salon_id AND sub.status IN ('trial', 'active')
                LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
                WHERE u.id = :user_id
                ORDER BY sub.created_at DESC LIMIT 1";

        $stmt = DatabaseManager::query($sql, ['user_id' => $userId]);
        $data = $stmt->fetch();

        if (!$data) return [];

        // 4. PRIORITY: Custom Overrides on Salon level
        if (!empty($data['custom_permissions'])) {
            return json_decode($data['custom_permissions'], true);
        }

        // 5. TRIAL LOGIC (Full access if trial is active)
        if ($data['sub_status'] === 'trial') {
            $isExpired = $data['expires_at'] && strtotime($data['expires_at']) < time();
            if (!$data['expires_at'] || !$isExpired) {
                return ['*'];
            }
        }

        // 6. PLAN LOGIC
        if ($data['plan_permissions']) {
            return json_decode($data['plan_permissions'], true);
        }

        // 7. Fallback: salon_owner gets full access to their own salon
        if ($role === 'salon_owner') {
            return ['*'];
        }

        return [];
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
