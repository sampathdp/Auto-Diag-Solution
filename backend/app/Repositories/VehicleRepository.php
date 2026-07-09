<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class VehicleRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'year', 'make', 'model', 'created_at'];

    public function __construct()
    {
        parent::__construct('vehicles');
    }

    /**
     * Paginated list with a live products_count via LEFT JOIN + GROUP BY
     * (same reasoning as CategoryRepository::paginate — avoids N+1).
     */
    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'year';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT v.*, COUNT(pv.id) AS products_count
                FROM vehicles v
                LEFT JOIN product_vehicle pv ON pv.vehicle_id = v.id
                {$whereSql}
                GROUP BY v.id
                ORDER BY v.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM vehicles v {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function productCount(int $id): int
    {
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM product_vehicle WHERE vehicle_id = :id", ['id' => $id]);
        return (int) $stmt->fetch()['c'];
    }

    public function existsCombo(int $year, string $make, string $model, ?int $excludeId = null): bool
    {
        $sql = "SELECT id FROM vehicles WHERE year = :year AND make = :make AND model = :model";
        $params = ['year' => $year, 'make' => $make, 'model' => $model];
        if ($excludeId !== null) {
            $sql .= " AND id != :excludeId";
            $params['excludeId'] = $excludeId;
        }
        return (bool) DatabaseManager::query($sql . " LIMIT 1", $params)->fetch();
    }

    /** Distinct years, newest first — leftmost prefix of uq_vehicles_year_make_model. */
    public function distinctYears(): array
    {
        return DatabaseManager::query("SELECT DISTINCT year FROM vehicles ORDER BY year DESC")->fetchAll(\PDO::FETCH_COLUMN);
    }

    /** Distinct makes, optionally scoped to a year — still an indexed lookup via the composite key. */
    public function distinctMakes(?int $year): array
    {
        if ($year !== null) {
            return DatabaseManager::query(
                "SELECT DISTINCT make FROM vehicles WHERE year = :year ORDER BY make ASC",
                ['year' => $year]
            )->fetchAll(\PDO::FETCH_COLUMN);
        }
        return DatabaseManager::query("SELECT DISTINCT make FROM vehicles ORDER BY make ASC")->fetchAll(\PDO::FETCH_COLUMN);
    }

    /** Distinct models, optionally scoped to year + make. */
    public function distinctModels(?int $year, ?string $make): array
    {
        $conditions = [];
        $params = [];
        if ($year !== null) {
            $conditions[] = 'year = :year';
            $params['year'] = $year;
        }
        if ($make !== null && $make !== '') {
            $conditions[] = 'make = :make';
            $params['make'] = $make;
        }
        $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return DatabaseManager::query(
            "SELECT DISTINCT model FROM vehicles {$where} ORDER BY model ASC",
            $params
        )->fetchAll(\PDO::FETCH_COLUMN);
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        if (array_key_exists('year', $filters)) {
            $conditions[] = 'v.year = :year';
            $params['year'] = $filters['year'];
        }
        if (array_key_exists('make', $filters)) {
            $conditions[] = 'v.make = :make';
            $params['make'] = $filters['make'];
        }
        if ($search !== '') {
            $conditions[] = '(v.make LIKE :search1 OR v.model LIKE :search2)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
