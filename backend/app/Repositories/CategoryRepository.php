<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class CategoryRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name_en', 'sort_order', 'created_at'];

    public function __construct()
    {
        parent::__construct('categories');
    }

    /**
     * Paginated list with a live products_count — computed via LEFT JOIN + GROUP BY
     * in the same query rather than one COUNT query per row (N+1), so page size
     * doesn't change the number of round trips to the database.
     */
    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'sort_order';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT c.*, COUNT(p.id) AS products_count
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id
                {$whereSql}
                GROUP BY c.id
                ORDER BY c.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM categories c {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function productCount(int $id): int
    {
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM products WHERE category_id = :id", ['id' => $id]);
        return (int) $stmt->fetch()['c'];
    }

    public function hasChildren(int $id): bool
    {
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM categories WHERE parent_id = :id", ['id' => $id]);
        return (int) $stmt->fetch()['c'] > 0;
    }

    /**
     * True if setting $categoryId's parent to $newParentId would create a cycle
     * (assigning itself, or one of its own descendants, as its ancestor).
     */
    public function wouldCreateCycle(int $categoryId, int $newParentId): bool
    {
        if ($categoryId === $newParentId) {
            return true;
        }

        $currentId = $newParentId;
        $visited = [];
        while ($currentId !== null) {
            if ($currentId === $categoryId || isset($visited[$currentId])) {
                return true;
            }
            $visited[$currentId] = true;
            $row = $this->find($currentId);
            $currentId = $row ? ($row['parent_id'] !== null ? (int) $row['parent_id'] : null) : null;
        }

        return false;
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        if (array_key_exists('parent_id', $filters)) {
            if ($filters['parent_id'] === null) {
                $conditions[] = 'c.parent_id IS NULL';
            } else {
                $conditions[] = 'c.parent_id = :parent_id';
                $params['parent_id'] = $filters['parent_id'];
            }
        }

        if (array_key_exists('is_active', $filters)) {
            $conditions[] = 'c.is_active = :is_active';
            $params['is_active'] = $filters['is_active'];
        }

        if ($search !== '') {
            $conditions[] = '(c.name_en LIKE :search1 OR c.name_ar LIKE :search2 OR c.slug LIKE :search3)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
            $params['search3'] = $like;
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
