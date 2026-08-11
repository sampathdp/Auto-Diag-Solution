<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

/**
 * Customers are `users` with role = 'customer' — this repo never touches other
 * roles, and orders_count/total_spent/default address are joined in for the
 * admin console rather than computed per-row in PHP.
 */
class CustomerRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('users');
    }

    public function paginate(array $filters, string $search, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
                       COALESCE(o.orders_count, 0) AS orders_count,
                       COALESCE(o.total_spent, 0) AS total_spent
                FROM users u
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS orders_count, SUM(total) AS total_spent
                    FROM orders
                    WHERE status != 'cancelled'
                    GROUP BY user_id
                ) o ON o.user_id = u.id
                {$whereSql}
                ORDER BY u.created_at DESC
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);

        $sql = "SELECT COUNT(*) AS c
                FROM users u
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS orders_count
                    FROM orders
                    WHERE status != 'cancelled'
                    GROUP BY user_id
                ) o ON o.user_id = u.id
                {$whereSql}";

        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function findCustomer(int $id): ?array
    {
        $row = DatabaseManager::query(
            "SELECT id, name, email, phone, is_active, created_at
             FROM users WHERE id = :id AND role = 'customer'",
            ['id' => $id]
        )->fetch();
        return $row ?: null;
    }

    public function defaultAddress(int $userId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT emirate, city FROM customer_addresses
             WHERE user_id = :user_id
             ORDER BY is_default DESC, id ASC
             LIMIT 1",
            ['user_id' => $userId]
        )->fetch();
        return $row ?: null;
    }

    public function addresses(int $userId): array
    {
        return DatabaseManager::query(
            "SELECT id, user_id AS customer_id, label, full_name, phone, emirate, city,
                    area, street_address, building, apartment, is_default
             FROM customer_addresses
             WHERE user_id = :user_id
             ORDER BY is_default DESC, id ASC",
            ['user_id' => $userId]
        )->fetchAll();
    }

    public function setActive(int $id, bool $isActive): void
    {
        DatabaseManager::query(
            "UPDATE users SET is_active = :is_active WHERE id = :id",
            ['is_active' => $isActive ? 1 : 0, 'id' => $id]
        );
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = ["u.role = 'customer'"];
        $params = [];

        if (array_key_exists('status', $filters)) {
            $conditions[] = 'u.is_active = :is_active';
            $params['is_active'] = $filters['status'] === 'active' ? 1 : 0;
        }

        if (array_key_exists('has_orders', $filters)) {
            $conditions[] = $filters['has_orders']
                ? 'COALESCE(o.orders_count, 0) > 0'
                : 'COALESCE(o.orders_count, 0) = 0';
        }

        if ($search !== '') {
            $conditions[] = '(u.name LIKE :search1 OR u.email LIKE :search2)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
        }

        return ['WHERE ' . implode(' AND ', $conditions), $params];
    }
}
