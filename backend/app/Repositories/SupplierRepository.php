<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;
use App\Core\Database\QueryBuilder;
use App\Core\Encryption;

class SupplierRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name', 'created_at'];

    public function __construct()
    {
        parent::__construct('suppliers');
    }

    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $builder = $this->filtered($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'name';
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
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM products WHERE supplier_id = :id", ['id' => $id]);
        return (int) $stmt->fetch()['c'];
    }

    /**
     * Decrypts and returns the stored api_key for internal backend use only (e.g. the
     * future 3PL sync job) — never exposed through any Controller/Service response.
     */
    public function getDecryptedApiKey(int $id): ?string
    {
        $row = DatabaseManager::query("SELECT api_key FROM suppliers WHERE id = :id", ['id' => $id])->fetch();
        if (!$row || $row['api_key'] === null || $row['api_key'] === '') {
            return null;
        }
        return Encryption::decrypt($row['api_key']);
    }

    private function filtered(array $filters, string $search): QueryBuilder
    {
        $builder = QueryBuilder::table('suppliers');

        if (array_key_exists('status', $filters)) {
            $builder->where('status', '=', $filters['status']);
        }
        if ($search !== '') {
            $builder->whereSearch(['name', 'slug', 'contact_email'], $search);
        }

        return $builder;
    }
}
