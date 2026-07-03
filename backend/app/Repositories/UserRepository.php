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
}
