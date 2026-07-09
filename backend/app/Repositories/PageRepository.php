<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;
use App\Core\Database\QueryBuilder;

class PageRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'title_en', 'created_at'];

    public function __construct()
    {
        parent::__construct('pages');
    }

    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $builder = $this->filtered($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'title_en';
        $builder->orderBy($sortBy, $sortDir)->paginate($page, $perPage);
        [$sql, $params] = $builder->buildSelect();
        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$sql, $params] = $this->filtered($filters, $search)->buildCount();
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    private function filtered(array $filters, string $search): QueryBuilder
    {
        $builder = QueryBuilder::table('pages');

        if (array_key_exists('is_published', $filters)) {
            $builder->where('is_published', '=', $filters['is_published']);
        }
        if ($search !== '') {
            $builder->whereSearch(['title_en', 'title_ar', 'slug'], $search);
        }

        return $builder;
    }
}
