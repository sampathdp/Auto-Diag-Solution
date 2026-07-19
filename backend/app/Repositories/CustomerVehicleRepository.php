<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class CustomerVehicleRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('customer_vehicles');
    }

    public function forUser(int $userId): array
    {
        return DatabaseManager::query(
            "SELECT * FROM customer_vehicles WHERE user_id = :user_id ORDER BY is_default DESC, created_at ASC",
            ['user_id' => $userId]
        )->fetchAll();
    }

    public function findForUser(int $id, int $userId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM customer_vehicles WHERE id = :id AND user_id = :user_id",
            ['id' => $id, 'user_id' => $userId]
        )->fetch();
        return $row ?: null;
    }

    public function clearDefaultForUser(int $userId): void
    {
        DatabaseManager::query(
            "UPDATE customer_vehicles SET is_default = 0 WHERE user_id = :user_id",
            ['user_id' => $userId]
        );
    }

    public function countForUser(int $userId): int
    {
        return (int) DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM customer_vehicles WHERE user_id = :user_id",
            ['user_id' => $userId]
        )->fetch()['c'];
    }
}
