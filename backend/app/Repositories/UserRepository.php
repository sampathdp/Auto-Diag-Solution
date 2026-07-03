<?php

declare(strict_types=1);

namespace App\Repositories;

class UserRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('users');
    }

    public function findByEmail(string $email): ?array
    {
        // COALESCE ensures staff users get their branch_id from the staff table
        // (users.branch_id is never set for staff — branch assignment lives in staff table)
        $sql = "SELECT u.*, s.slug as salon_slug,
                       COALESCE(u.branch_id, st.branch_id) as branch_id
                FROM users u
                LEFT JOIN salons s ON u.salon_id = s.id
                LEFT JOIN staff st ON st.user_id = u.id
                WHERE u.email = :email LIMIT 1";
        $stmt = \App\Core\Database\DatabaseManager::query($sql, ['email' => $email]);
        return $stmt->fetch() ?: null;
    }
}
