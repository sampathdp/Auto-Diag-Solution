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
     * Paginated list with a live products_count — a correlated subquery (not a JOIN +
     * GROUP BY) because fitment is now freeform (product_fitments has no vehicle_id;
     * a product "counts" for a catalog row when its make/model match and the row's
     * year falls inside the product's year_from/year_to range).
     */
    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'year';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT v.*, (
                    SELECT COUNT(*) FROM product_fitments pf
                    WHERE LOWER(pf.make) = LOWER(v.make) AND LOWER(pf.model) = LOWER(v.model)
                      AND pf.year_from <= v.year AND pf.year_to >= v.year
                ) AS products_count
                FROM vehicles v
                {$whereSql}
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
        $stmt = DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM product_fitments pf
             JOIN vehicles v ON LOWER(pf.make) = LOWER(v.make) AND LOWER(pf.model) = LOWER(v.model)
                AND pf.year_from <= v.year AND pf.year_to >= v.year
             WHERE v.id = :id",
            ['id' => $id]
        );
        return (int) $stmt->fetch()['c'];
    }

    /**
     * `chassis_code <=> :chassis_code` is MySQL's NULL-safe equals — two "no chassis"
     * rows (both NULL) count as the same combo, unlike the raw UNIQUE KEY (which treats
     * every NULL as distinct and would silently allow duplicate no-chassis rows).
     */
    public function existsCombo(int $year, string $make, string $model, ?string $chassisCode, ?int $excludeId = null): bool
    {
        $sql = "SELECT id FROM vehicles WHERE year = :year AND make = :make AND model = :model AND chassis_code <=> :chassis_code";
        $params = ['year' => $year, 'make' => $make, 'model' => $model, 'chassis_code' => $chassisCode];
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
