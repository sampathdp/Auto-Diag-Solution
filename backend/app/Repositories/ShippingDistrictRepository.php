<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class ShippingDistrictRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name', 'is_active', 'created_at'];

    public function __construct()
    {
        parent::__construct('shipping_districts');
    }

    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'name';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT d.*, r.rate, r.free_shipping_threshold
                FROM shipping_districts d
                LEFT JOIN shipping_rates r ON r.district_id = d.id
                {$whereSql}
                ORDER BY d.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM shipping_districts d {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    /** Addresses currently pointing at this district — shown so an admin isn't surprised by a delete's fallout. */
    public function addressCount(int $id): int
    {
        $stmt = DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM customer_addresses WHERE district_id = :id",
            ['id' => $id]
        );
        return (int) $stmt->fetch()['c'];
    }

    /** Active districts with their rate (if priced) — feeds the storefront address/checkout district picker. */
    public function activeWithRate(): array
    {
        return DatabaseManager::query(
            "SELECT d.id, d.name, r.rate, r.free_shipping_threshold
             FROM shipping_districts d
             LEFT JOIN shipping_rates r ON r.district_id = d.id
             WHERE d.is_active = 1
             ORDER BY d.name ASC"
        )->fetchAll();
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        if (array_key_exists('is_active', $filters)) {
            $conditions[] = 'd.is_active = :is_active';
            $params['is_active'] = $filters['is_active'];
        }
        if ($search !== '') {
            $conditions[] = 'd.name LIKE :search';
            $params['search'] = "%$search%";
        }

        $sql = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
