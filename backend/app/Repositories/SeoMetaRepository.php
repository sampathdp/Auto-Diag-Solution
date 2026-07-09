<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;
use App\Core\Database\QueryBuilder;

class SeoMetaRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'path', 'created_at'];

    public function __construct()
    {
        parent::__construct('seo_meta');
    }

    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $builder = $this->filtered($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'created_at';
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
        $builder = QueryBuilder::table('seo_meta');

        if (array_key_exists('page_type', $filters)) {
            $builder->where('page_type', '=', $filters['page_type']);
        }
        if (array_key_exists('reference_id', $filters)) {
            $builder->where('reference_id', '=', $filters['reference_id']);
        }
        if ($search !== '') {
            $builder->whereSearch(['path', 'meta_title_en', 'meta_title_ar'], $search);
        }

        return $builder;
    }
}
