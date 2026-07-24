<?php

declare(strict_types=1);

namespace App\Repositories;

class UserRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('users');
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = \App\Core\Database\DatabaseManager::query(
            "SELECT * FROM users WHERE email = :email LIMIT 1",
            ['email' => $email]
        );
        return $stmt->fetch() ?: null;
    }

    public function findByOauth(string $provider, string $oauthId): ?array
    {
        $stmt = \App\Core\Database\DatabaseManager::query(
            "SELECT * FROM users WHERE oauth_provider = :provider AND oauth_id = :oauth_id LIMIT 1",
            ['provider' => $provider, 'oauth_id' => $oauthId]
        );
        return $stmt->fetch() ?: null;
    }
}
