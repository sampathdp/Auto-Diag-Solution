<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class BrandRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name_en', 'created_at'];

    public function __construct()
    {
        parent::__construct('brands');
    }

    // Live products_count via LEFT JOIN + GROUP BY in the same query (not one COUNT
    // per row) — same convention as CategoryRepository::paginate().
    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'name_en';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT b.*, COUNT(p.id) AS products_count
                FROM brands b
                LEFT JOIN products p ON p.brand_id = b.id
                {$whereSql}
                GROUP BY b.id
                ORDER BY b.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        if (array_key_exists('is_active', $filters)) {
            $conditions[] = 'b.is_active = :is_active';
            $params['is_active'] = $filters['is_active'];
        }
        if ($search !== '') {
            $conditions[] = '(b.name_en LIKE :search1 OR b.name_ar LIKE :search2 OR b.slug LIKE :search3)';
            $params['search1'] = "%$search%";
            $params['search2'] = "%$search%";
            $params['search3'] = "%$search%";
        }

        $sql = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM brands b {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function productCount(int $id): int
    {
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM products WHERE brand_id = :id", ['id' => $id]);
        return (int) $stmt->fetch()['c'];
    }
}
