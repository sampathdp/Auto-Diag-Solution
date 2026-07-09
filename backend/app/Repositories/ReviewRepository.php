<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class ReviewRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'rating', 'created_at'];

    public function __construct()
    {
        parent::__construct('reviews');
    }

    /** Paginated list with reviewer name and product name joined in for the moderation table. */
    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'created_at';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT r.*, u.name AS reviewer_name, p.name_en AS product_name_en
                FROM reviews r
                LEFT JOIN users u ON u.id = r.user_id
                LEFT JOIN products p ON p.id = r.product_id
                {$whereSql}
                ORDER BY r.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM reviews r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN products p ON p.id = r.product_id {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function findWithDetails(int $id): ?array
    {
        $row = DatabaseManager::query(
            "SELECT r.*, u.name AS reviewer_name, p.name_en AS product_name_en
             FROM reviews r
             LEFT JOIN users u ON u.id = r.user_id
             LEFT JOIN products p ON p.id = r.product_id
             WHERE r.id = :id",
            ['id' => $id]
        )->fetch();
        return $row ?: null;
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        if (array_key_exists('is_approved', $filters)) {
            $conditions[] = 'r.is_approved = :is_approved';
            $params['is_approved'] = $filters['is_approved'];
        }
        if (array_key_exists('product_id', $filters)) {
            $conditions[] = 'r.product_id = :product_id';
            $params['product_id'] = $filters['product_id'];
        }
        if (array_key_exists('rating', $filters)) {
            $conditions[] = 'r.rating = :rating';
            $params['rating'] = $filters['rating'];
        }

        if ($search !== '') {
            $conditions[] = '(r.title LIKE :search1 OR r.comment LIKE :search2 OR u.name LIKE :search3)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
            $params['search3'] = $like;
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
