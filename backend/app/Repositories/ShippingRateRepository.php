<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class ShippingRateRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'rate', 'free_shipping_threshold', 'created_at'];

    public function __construct()
    {
        parent::__construct('shipping_rates');
    }

    // district_name joined in for the admin Rates table — a rate row is meaningless
    // without knowing which district it prices.
    public function paginate(string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? "r.{$sortBy}" : 'd.name';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT r.*, d.name AS district_name
                FROM shipping_rates r
                JOIN shipping_districts d ON d.id = r.district_id
                {$whereSql}
                ORDER BY {$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($search);
        $sql = "SELECT COUNT(*) AS c FROM shipping_rates r JOIN shipping_districts d ON d.id = r.district_id {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function findByDistrict(int $districtId): ?array
    {
        $stmt = DatabaseManager::query(
            "SELECT * FROM shipping_rates WHERE district_id = :district_id",
            ['district_id' => $districtId]
        );
        return $stmt->fetch() ?: null;
    }

    private function buildWhere(string $search): array
    {
        if ($search === '') {
            return ['', []];
        }
        return ['WHERE d.name LIKE :search', ['search' => "%$search%"]];
    }
}
