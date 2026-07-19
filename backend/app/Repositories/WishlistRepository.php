<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class WishlistRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('wishlists');
    }

    /** Product ids in the order they were added. */
    public function productIdsForUser(int $userId): array
    {
        return DatabaseManager::query(
            "SELECT product_id FROM wishlists WHERE user_id = :user_id ORDER BY created_at ASC",
            ['user_id' => $userId]
        )->fetchAll(\PDO::FETCH_COLUMN);
    }

    public function exists(int $userId, int $productId): bool
    {
        $row = DatabaseManager::query(
            "SELECT id FROM wishlists WHERE user_id = :user_id AND product_id = :product_id",
            ['user_id' => $userId, 'product_id' => $productId]
        )->fetch();
        return (bool)$row;
    }

    public function add(int $userId, int $productId): void
    {
        if ($this->exists($userId, $productId)) {
            return;
        }
        $this->create(['user_id' => $userId, 'product_id' => $productId]);
    }

    public function remove(int $userId, int $productId): void
    {
        DatabaseManager::query(
            "DELETE FROM wishlists WHERE user_id = :user_id AND product_id = :product_id",
            ['user_id' => $userId, 'product_id' => $productId]
        );
    }

    public function clear(int $userId): void
    {
        DatabaseManager::query("DELETE FROM wishlists WHERE user_id = :user_id", ['user_id' => $userId]);
    }
}
