<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class PromoCodeRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('promo_codes');
    }

    public function findByCode(string $code): ?array
    {
        $sql = "SELECT * FROM promo_codes WHERE code = :code LIMIT 1";
        $stmt = DatabaseManager::query($sql, ['code' => strtoupper(trim($code))]);
        return $stmt->fetch() ?: null;
    }

    public function getAll(): array
    {
        return DatabaseManager::query("SELECT * FROM promo_codes ORDER BY created_at DESC")->fetchAll();
    }

    public function incrementRedemptions(int $id): void
    {
        DatabaseManager::query(
            "UPDATE promo_codes SET times_redeemed = times_redeemed + 1 WHERE id = :id",
            ['id' => $id]
        );
    }
}
