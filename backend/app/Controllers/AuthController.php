<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Auth\JWTService;
use App\Core\Database\DatabaseManager;
use App\Repositories\UserRepository;
use App\Services\RateLimiter;
use App\Services\TwoFactorService;
use App\Services\SocialAuth\GoogleTokenVerifier;
use App\Services\SocialAuth\FacebookTokenVerifier;
use App\Services\SocialAuth\SocialAuthException;

class AuthController extends BaseController
{
    private JWTService $jwtService;
    private UserRepository $userRepo;

    public function __construct()
    {
        $this->jwtService = new JWTService();
        $this->userRepo = new UserRepository();
    }

    // Per-email lockout: tighter, since it only punishes attackers targeting one account.
    private const LOGIN_EMAIL_MAX_ATTEMPTS = 5;
    private const LOGIN_EMAIL_LOCKOUT_SECONDS = 900; // 15 minutes

    // Per-IP lockout: looser (shared NATs/offices have multiple real users), but closes
    // the gap where an attacker sprays low-and-slow attempts across many different emails.
    private const LOGIN_IP_MAX_ATTEMPTS = 20;
    private const LOGIN_IP_LOCKOUT_SECONDS = 900;

    // Registration is unauthenticated and was previously fully unthrottled — this both
    // limits automated account creation and caps the email-enumeration signal leaked by
    // the 409 "already exists" response below.
    private const REGISTER_IP_MAX_ATTEMPTS = 10;
    private const REGISTER_IP_LOCKOUT_SECONDS = 3600; // 1 hour

    // Same shape as registration throttling — forgot-password is also unauthenticated
    // and, like registration, can be used to spam an inbox or enumerate accounts.
    private const FORGOT_PASSWORD_IP_MAX_ATTEMPTS = 10;
    private const FORGOT_PASSWORD_IP_LOCKOUT_SECONDS = 3600; // 1 hour

    private const RESET_TOKEN_TTL_SECONDS = 1800; // 30 minutes

    // Social sign-in is unauthenticated like registration, and can create accounts
    // just like it — same throttling shape.
    private const OAUTH_IP_MAX_ATTEMPTS = 10;
    private const OAUTH_IP_LOCKOUT_SECONDS = 3600; // 1 hour

    private function lockoutMessage(int $lockedSeconds): string
    {
        return 'Too many attempts. Try again in ' . (int)ceil($lockedSeconds / 60) . ' minute(s).';
    }

    public function login(Request $request): void
    {
        $email = strtolower(trim((string)$request->input('email')));
        $password = $request->input('password');
        $ip = $request->getIp();

        TwoFactorService::ensureSchema();

        $emailLockSeconds = RateLimiter::secondsUntilUnlocked('login:email', $email);
        $ipLockSeconds = RateLimiter::secondsUntilUnlocked('login:ip', $ip);
        $lockedSeconds = max($emailLockSeconds, $ipLockSeconds);
        if ($lockedSeconds > 0) {
            $this->error($this->lockoutMessage($lockedSeconds), null, 429);
            return;
        }

        $user = $this->userRepo->findByEmail($email);

        if (!$user || !password_verify($password, $user['password'])) {
            RateLimiter::hit('login:email', $email, self::LOGIN_EMAIL_MAX_ATTEMPTS, self::LOGIN_EMAIL_LOCKOUT_SECONDS);
            RateLimiter::hit('login:ip', $ip, self::LOGIN_IP_MAX_ATTEMPTS, self::LOGIN_IP_LOCKOUT_SECONDS);
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
                RateLimiter::hit('login:email', $email, self::LOGIN_EMAIL_MAX_ATTEMPTS, self::LOGIN_EMAIL_LOCKOUT_SECONDS);
                RateLimiter::hit('login:ip', $ip, self::LOGIN_IP_MAX_ATTEMPTS, self::LOGIN_IP_LOCKOUT_SECONDS);
                $this->error('Invalid 2FA code', null, 401);
                return;
            }
        }

        RateLimiter::clear('login:email', $email);
        RateLimiter::clear('login:ip', $ip);

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
        $ip = $request->getIp();

        $lockedSeconds = RateLimiter::secondsUntilUnlocked('register:ip', $ip);
        if ($lockedSeconds > 0) {
            $this->error($this->lockoutMessage($lockedSeconds), null, 429);
            return;
        }

        // Count every attempt (not just failures) — this caps the email-enumeration
        // signal from the 409 response below just as much as it caps account spam.
        RateLimiter::hit('register:ip', $ip, self::REGISTER_IP_MAX_ATTEMPTS, self::REGISTER_IP_LOCKOUT_SECONDS);

        $data = $request->all();
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        $name = trim((string)($data['name'] ?? ''));

        if ($email === '' || $password === '' || $name === '') {
            $this->error('Name, email, and password are required', null, 400);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('A valid email address is required', null, 400);
            return;
        }

        if (strlen($password) < 8) {
            $this->error('Password must be at least 8 characters long', null, 400);
            return;
        }

        if ($this->userRepo->findByEmail($email)) {
            $this->error('A user with this email already exists', null, 409);
            return;
        }

        DatabaseManager::query(
            "INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role)",
            [
                'name' => $name,
                'email' => $email,
                'password' => password_hash($password, PASSWORD_BCRYPT),
                'role' => 'customer',
            ]
        );

        $this->success(null, 'User registered successfully', 201);
    }

    public function googleLogin(Request $request): void
    {
        $credential = (string)$request->input('credential');
        if ($credential === '') {
            $this->error('Google credential is required', null, 400);
            return;
        }

        try {
            $profile = (new GoogleTokenVerifier())->verify($credential);
        } catch (SocialAuthException $e) {
            $this->error($e->getMessage(), null, 401);
            return;
        }

        $this->issueSessionForSocialUser($profile, 'google', $request->getIp());
    }

    public function facebookLogin(Request $request): void
    {
        $accessToken = (string)$request->input('access_token');
        if ($accessToken === '') {
            $this->error('Facebook access token is required', null, 400);
            return;
        }

        try {
            $profile = (new FacebookTokenVerifier())->verify($accessToken);
        } catch (SocialAuthException $e) {
            $this->error($e->getMessage(), null, 401);
            return;
        }

        $this->issueSessionForSocialUser($profile, 'facebook', $request->getIp());
    }

    /**
     * Find-or-create the local user for an already-verified social profile, then
     * issue the same cookie-based session login()/changePassword() issue.
     *
     * @param array{oauth_id: string, email: string, name: string} $profile
     */
    private function issueSessionForSocialUser(array $profile, string $provider, string $ip): void
    {
        $lockedSeconds = RateLimiter::secondsUntilUnlocked('oauth:ip', $ip);
        if ($lockedSeconds > 0) {
            $this->error($this->lockoutMessage($lockedSeconds), null, 429);
            return;
        }
        RateLimiter::hit('oauth:ip', $ip, self::OAUTH_IP_MAX_ATTEMPTS, self::OAUTH_IP_LOCKOUT_SECONDS);

        $user = $this->userRepo->findByOauth($provider, $profile['oauth_id']);

        if (!$user) {
            // Same verified email as an existing password account — link instead of
            // creating a duplicate.
            $user = $this->userRepo->findByEmail($profile['email']);

            if ($user) {
                $this->userRepo->update((int)$user['id'], [
                    'oauth_provider' => $provider,
                    'oauth_id' => $profile['oauth_id'],
                ]);
                $user = $this->userRepo->find((int)$user['id']);
            } else {
                $userId = $this->userRepo->create([
                    'name' => $profile['name'],
                    'email' => $profile['email'],
                    'password' => null,
                    'role' => 'customer',
                    'oauth_provider' => $provider,
                    'oauth_id' => $profile['oauth_id'],
                ]);
                $user = $this->userRepo->find($userId);
            }
        }

        if (!$user || !(bool)($user['is_active'] ?? true)) {
            $this->error('This account is not available', null, 403);
            return;
        }

        $accessToken = $this->jwtService->generateAccessToken($user);
        $refreshToken = $this->jwtService->generateRefreshToken((int)$user['id']);
        $decoded = $this->jwtService->validateToken($accessToken);

        $this->setAuthCookies($accessToken, $refreshToken);

        $this->success([
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'role' => $user['role'],
                'needs_password_change' => false,
            ],
            'permissions' => $decoded->permissions ?? []
        ], 'Login successful');
    }

    public function forgotPassword(Request $request): void
    {
        $ip = $request->getIp();

        $lockedSeconds = RateLimiter::secondsUntilUnlocked('forgot-password:ip', $ip);
        if ($lockedSeconds > 0) {
            $this->error($this->lockoutMessage($lockedSeconds), null, 429);
            return;
        }
        RateLimiter::hit('forgot-password:ip', $ip, self::FORGOT_PASSWORD_IP_MAX_ATTEMPTS, self::FORGOT_PASSWORD_IP_LOCKOUT_SECONDS);

        $email = strtolower(trim((string)$request->input('email')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('A valid email address is required', null, 400);
            return;
        }

        $genericMessage = 'If an account exists for that address, a password reset link has been sent.';

        $user = $this->userRepo->findByEmail($email);
        if (!$user) {
            // Deliberately identical response to the "found" path below (minus the dev-mode
            // link) so this endpoint can't be used to enumerate registered emails.
            $this->success(null, $genericMessage);
            return;
        }

        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $expiresAt = date('Y-m-d H:i:s', time() + self::RESET_TOKEN_TTL_SECONDS);

        DatabaseManager::query(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)",
            ['user_id' => $user['id'], 'token_hash' => $tokenHash, 'expires_at' => $expiresAt]
        );

        $frontendUrl = rtrim((string)($_ENV['FRONTEND_URL'] ?? 'http://localhost:3000'), '/');
        $resetUrl = "{$frontendUrl}/en/reset-password?token={$rawToken}";

        if (\App\Services\Mail\Mailer::isConfigured()) {
            $safeName = htmlspecialchars((string)$user['name'], ENT_QUOTES, 'UTF-8');
            \App\Services\Mail\EmailOutbox::queue(
                (string)$user['email'],
                'Reset your password',
                "<p>Hi {$safeName},</p><p>Click the link below to reset your password. This link expires in 30 minutes.</p><p><a href=\"{$resetUrl}\">{$resetUrl}</a></p>",
                null,
                'password_reset'
            );

            $this->success(null, $genericMessage);
            return;
        }

        // Dev-mode fallback: SMTP credentials aren't configured yet, so hand the link back
        // directly instead of silently discarding it. Once SMTP_HOST is set in .env, this
        // branch stops being reachable and the email actually gets sent above.
        $this->success(
            ['reset_url' => $resetUrl, 'dev_mode' => true],
            'SMTP is not configured yet — showing the reset link directly instead of emailing it.'
        );
    }

    public function resetPassword(Request $request): void
    {
        $token = (string)$request->input('token');
        $newPassword = (string)$request->input('new_password');

        if ($token === '' || $newPassword === '') {
            $this->error('Token and new password are required', null, 400);
            return;
        }

        if (strlen($newPassword) < 8) {
            $this->error('Password must be at least 8 characters long', null, 400);
            return;
        }

        $tokenHash = hash('sha256', $token);
        $resetRow = DatabaseManager::query(
            "SELECT * FROM password_reset_tokens WHERE token_hash = :token_hash LIMIT 1",
            ['token_hash' => $tokenHash]
        )->fetch();

        if (!$resetRow || $resetRow['used_at'] !== null || strtotime($resetRow['expires_at']) < time()) {
            $this->error('This reset link is invalid or has expired', null, 400);
            return;
        }

        $user = $this->userRepo->find((int)$resetRow['user_id']);
        if (!$user) {
            $this->error('This reset link is invalid or has expired', null, 400);
            return;
        }

        $this->userRepo->update((int)$user['id'], [
            'password' => password_hash($newPassword, PASSWORD_BCRYPT),
        ]);

        DatabaseManager::query(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = :id",
            ['id' => $resetRow['id']]
        );

        // A password reset should invalidate every existing session — otherwise a
        // previously-stolen refresh token would still work after the "fix".
        DatabaseManager::query(
            "DELETE FROM refresh_tokens WHERE user_id = :user_id",
            ['user_id' => $user['id']]
        );

        $this->success(null, 'Password reset successfully. You can now sign in with your new password.');
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

        // Fresh from the database, not the token: a permission granted or revoked since
        // login shows up on the next /auth/me instead of after the token expires.
        $permissionService = new \App\Services\PermissionService();
        $user->permissions = $permissionService->forUser((int)$user->id);
        $user->is_super_admin = $permissionService->isSuperAdmin((int)$user->id);

        $this->success([
            'user' => $user,
            'permissions' => $user->permissions
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

        if (strlen($newPassword) < 8) {
            $this->error('New password must be at least 8 characters long', null, 400);
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

    private function isSecureRequest(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
            || (($_ENV['APP_ENV'] ?? 'local') === 'production');
    }

    private function setAuthCookies(string $accessToken, string $refreshToken): void
    {
        $isSecure = $this->isSecureRequest();
        // The frontend (Vercel) and this API (shared hosting) are on different
        // registrable domains — a genuinely cross-site request, not just a different
        // port like local dev. SameSite=Strict/Lax cookies are never sent on cross-site
        // fetch/XHR, so the very next request after login would look unauthenticated.
        // SameSite=None is the only value that works here, and it requires Secure.
        $base = [
            'path'     => '/',
            'httponly' => true,
            'secure'   => $isSecure,
            'samesite' => $isSecure ? 'None' : 'Lax',
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
        $isSecure = $this->isSecureRequest();
        $past = [
            'expires' => 1,
            'path' => '/',
            'httponly' => true,
            'secure' => $isSecure,
            'samesite' => $isSecure ? 'None' : 'Lax',
        ];
        setcookie('access_token', '', $past);
        setcookie('refresh_token', '', $past);
    }
}
