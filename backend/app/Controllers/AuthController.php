<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Auth\JWTService;
use App\Core\Database\DatabaseManager;
use App\Repositories\UserRepository;
use App\Services\TwoFactorService;

class AuthController extends BaseController
{
    private JWTService $jwtService;
    private UserRepository $userRepo;

    public function __construct()
    {
        $this->jwtService = new JWTService();
        $this->userRepo = new UserRepository();
    }

    private const MAX_LOGIN_ATTEMPTS = 5;
    private const LOGIN_LOCKOUT_SECONDS = 900; // 15 minutes

    private static bool $loginAttemptsTableReady = false;

    private static function ensureLoginAttemptsTable(): void
    {
        if (self::$loginAttemptsTableReady) {
            return;
        }

        try {
            DatabaseManager::query("
                CREATE TABLE IF NOT EXISTS login_attempts (
                    email VARCHAR(255) PRIMARY KEY,
                    attempts INT NOT NULL DEFAULT 0,
                    last_attempt_at TIMESTAMP NULL,
                    locked_until TIMESTAMP NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
            self::$loginAttemptsTableReady = true;
        } catch (\Exception $e) {
            // Ignore — table likely already exists
        }
    }

    private function secondsUntilUnlocked(string $email): int
    {
        $row = DatabaseManager::query(
            "SELECT locked_until FROM login_attempts WHERE email = :email LIMIT 1",
            ['email' => $email]
        )->fetch();

        if (!$row || !$row['locked_until']) {
            return 0;
        }

        return max(0, strtotime($row['locked_until']) - time());
    }

    private function recordFailedLoginAttempt(string $email): void
    {
        $row = DatabaseManager::query(
            "SELECT attempts FROM login_attempts WHERE email = :email LIMIT 1",
            ['email' => $email]
        )->fetch();

        $attempts = ($row ? (int)$row['attempts'] : 0) + 1;
        $lockedUntil = $attempts >= self::MAX_LOGIN_ATTEMPTS
            ? date('Y-m-d H:i:s', time() + self::LOGIN_LOCKOUT_SECONDS)
            : null;

        DatabaseManager::query(
            "INSERT INTO login_attempts (email, attempts, last_attempt_at, locked_until)
             VALUES (:email, :attempts, NOW(), :locked_until)
             ON DUPLICATE KEY UPDATE attempts = :attempts2, last_attempt_at = NOW(), locked_until = :locked_until2",
            [
                'email' => $email,
                'attempts' => $attempts,
                'locked_until' => $lockedUntil,
                'attempts2' => $attempts,
                'locked_until2' => $lockedUntil,
            ]
        );
    }

    private function clearFailedLoginAttempts(string $email): void
    {
        DatabaseManager::query("DELETE FROM login_attempts WHERE email = :email", ['email' => $email]);
    }

    public function login(Request $request): void
    {
        $email = strtolower(trim((string)$request->input('email')));
        $password = $request->input('password');

        self::ensureLoginAttemptsTable();
        TwoFactorService::ensureSchema();

        $lockedSeconds = $this->secondsUntilUnlocked($email);
        if ($lockedSeconds > 0) {
            $this->error(
                'Too many failed login attempts. Try again in ' . (int)ceil($lockedSeconds / 60) . ' minute(s).',
                null,
                429
            );
            return;
        }

        $user = $this->userRepo->findByEmail($email);

        if (!$user || !password_verify($password, $user['password'])) {
            $this->recordFailedLoginAttempt($email);
            $this->error('Invalid credentials', null, 401);
            return;
        }

        if (!empty($user['two_factor_enabled'])) {
            $code = (string) ($request->input('totp_code') ?? '');

            if ($code === '') {
                $this->error('2FA_REQUIRED', null, 400);
                return;
            }

            if (!TwoFactorService::verifyLoginCode($user, $code)) {
                $this->recordFailedLoginAttempt($email);
                $this->error('Invalid 2FA code', null, 401);
                return;
            }
        }

        $this->clearFailedLoginAttempts($email);

        $accessToken = $this->jwtService->generateAccessToken($user);
        $refreshToken = $this->jwtService->generateRefreshToken((int)$user['id']);

        // Decode token to get permissions for the response
        $decoded = $this->jwtService->validateToken($accessToken);

        // Store tokens in HttpOnly cookies — not accessible to JavaScript (XSS mitigation)
        $this->setAuthCookies($accessToken, $refreshToken);

        $this->success([
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'role' => $user['role'],
                'needs_password_change' => isset($user['needs_password_change']) && (int)$user['needs_password_change'] === 1
            ],
            'permissions' => $decoded->permissions ?? []
        ], 'Login successful');
    }

    public function register(Request $request): void
    {
        $data = $request->all();

        if (empty($data['email']) || empty($data['password']) || empty($data['name'])) {
            $this->error('Name, email, and password are required', null, 400);
            return;
        }

        if ($this->userRepo->findByEmail(strtolower(trim($data['email'])))) {
            $this->error('A user with this email already exists', null, 409);
            return;
        }

        DatabaseManager::query(
            "INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role)",
            [
                'name' => $data['name'],
                'email' => strtolower(trim($data['email'])),
                'password' => password_hash($data['password'], PASSWORD_BCRYPT),
                'role' => 'customer',
            ]
        );

        $this->success(null, 'User registered successfully', 201);
    }

    public function refresh(Request $request): void
    {
        // Read refresh token from HttpOnly cookie first, fall back to request body
        $token = $_COOKIE['refresh_token'] ?? $request->input('refresh_token');

        if (!$token) {
            $this->error('Refresh token required', null, 401);
        }

        $stmt = DatabaseManager::query("SELECT * FROM refresh_tokens WHERE token = :token AND is_revoked = 0", ['token' => $token]);
        $storedToken = $stmt->fetch();

        if (!$storedToken || strtotime($storedToken['expires_at']) < time()) {
            $this->error('Invalid or expired refresh token', null, 401);
        }

        // Rotate Refresh Token
        $this->jwtService->revokeRefreshToken($token);

        $user = $this->userRepo->find((int)$storedToken['user_id']);

        $newAccessToken = $this->jwtService->generateAccessToken($user);
        $newRefreshToken = $this->jwtService->generateRefreshToken((int)$user['id']);

        // Issue new cookies
        $this->setAuthCookies($newAccessToken, $newRefreshToken);

        $this->success(null, 'Token refreshed successfully');
    }

    public function me(Request $request): void
    {
        $user = clone $request->user;

        $this->success([
            'user' => $user,
            'permissions' => $user->permissions ?? []
        ], 'User data retrieved');
    }

    public function logout(Request $request): void
    {
        // Revoke from cookie first, then body (backward compat)
        $token = $_COOKIE['refresh_token'] ?? $request->input('refresh_token');
        if ($token) {
            $this->jwtService->revokeRefreshToken($token);
        }

        $this->clearAuthCookies();

        $this->success(null, 'Logged out successfully');
    }

    public function changePassword(Request $request): void
    {
        $userPayload = $request->user;
        if (!$userPayload) {
            $this->error('Unauthorized', null, 401);
        }

        $currentPassword = $request->input('current_password');
        $newPassword = $request->input('new_password');

        if (!$currentPassword || !$newPassword) {
            $this->error('Current password and new password are required', null, 400);
        }

        $user = $this->userRepo->find((int)$userPayload->id);
        if (!$user) {
            $this->error('User not found', null, 404);
        }

        if (!password_verify($currentPassword, $user['password'])) {
            $this->error('Incorrect current password', null, 400);
        }

        if (strlen($newPassword) < 6) {
            $this->error('New password must be at least 6 characters long', null, 400);
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

        $this->userRepo->update((int)$user['id'], [
            'password' => $hashedPassword,
            'needs_password_change' => 0
        ]);

        $updatedUser = $this->userRepo->findByEmail($user['email']);
        if (!$updatedUser) {
            $updatedUser = $user;
            $updatedUser['needs_password_change'] = 0;
        }

        $accessToken = $this->jwtService->generateAccessToken($updatedUser);
        $refreshToken = $this->jwtService->generateRefreshToken((int)$updatedUser['id']);
        $decoded = $this->jwtService->validateToken($accessToken);

        // Issue new cookies with updated token
        $this->setAuthCookies($accessToken, $refreshToken);

        $this->success([
            'user' => [
                'id' => $updatedUser['id'],
                'name' => $updatedUser['name'],
                'role' => $updatedUser['role'],
                'needs_password_change' => false
            ],
            'permissions' => $decoded->permissions ?? []
        ], 'Password updated successfully');
    }

    private function setAuthCookies(string $accessToken, string $refreshToken): void
    {
        $isProduction = ($_ENV['APP_ENV'] ?? 'local') === 'production';
        $base = [
            'path'     => '/',
            'httponly' => true,
            'secure'   => $isProduction,
            'samesite' => $isProduction ? 'Strict' : 'Lax',
        ];

        setcookie('access_token', $accessToken, array_merge($base, [
            'expires' => time() + $this->jwtService->getAccessExpiry(),
        ]));

        setcookie('refresh_token', $refreshToken, array_merge($base, [
            'expires' => time() + $this->jwtService->getRefreshExpiry(),
        ]));
    }

    private function clearAuthCookies(): void
    {
        $past = ['expires' => 1, 'path' => '/', 'httponly' => true, 'secure' => false, 'samesite' => 'Lax'];
        setcookie('access_token', '', $past);
        setcookie('refresh_token', '', $past);
    }
}
