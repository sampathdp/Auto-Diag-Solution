<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;
use App\Core\Database\QueryBuilder;

class BrandRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name_en', 'created_at'];

    public function __construct()
    {
        parent::__construct('brands');
    }

    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $builder = $this->filtered($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'name_en';
        $builder->orderBy($sortBy, $sortDir)->paginate($page, $perPage);
        [$sql, $params] = $builder->buildSelect();
        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$sql, $params] = $this->filtered($filters, $search)->buildCount();
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function productCount(int $id): int
    {
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM products WHERE brand_id = :id", ['id' => $id]);
        return (int) $stmt->fetch()['c'];
    }

    private function filtered(array $filters, string $search): QueryBuilder
    {
        $builder = QueryBuilder::table('brands');

        if (array_key_exists('is_active', $filters)) {
            $builder->where('is_active', '=', $filters['is_active']);
        }
        if ($search !== '') {
            $builder->whereSearch(['name_en', 'name_ar', 'slug'], $search);
        }

        return $builder;
    }
}
