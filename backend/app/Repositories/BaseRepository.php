<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;
use App\Core\Database\QueryBuilder;
use PDO;

abstract class BaseRepository
{
    protected string $table;

    public function __construct(string $table)
    {
        $this->table = $table;
    }

    public function find(int $id): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE id = :id";
        $params = ['id' => $id];

        $stmt = DatabaseManager::query($sql, $params);
        return $stmt->fetch() ?: null;
    }

    public function findBy(string $column, mixed $value): ?array
    {
        $this->assertValidColumnName($column);
        $stmt = DatabaseManager::query(
            "SELECT * FROM {$this->table} WHERE `{$column}` = :value LIMIT 1",
            ['value' => $value]
        );
        return $stmt->fetch() ?: null;
    }

    /**
     * True if another row (any id other than $excludeId) already has this value —
     * the standard "is this slug/sku/email taken by someone else" check used when
     * updating a row that's allowed to keep its own current value.
     */
    public function existsExcluding(string $column, mixed $value, int $excludeId): bool
    {
        $this->assertValidColumnName($column);
        $stmt = DatabaseManager::query(
            "SELECT id FROM {$this->table} WHERE `{$column}` = :value AND id != :excludeId LIMIT 1",
            ['value' => $value, 'excludeId' => $excludeId]
        );
        return (bool) $stmt->fetch();
    }

    public function count(array $filters = []): int
    {
        $builder = QueryBuilder::table($this->table);
        foreach ($filters as $col => $val) {
            $builder->where($col, '=', $val);
        }
        [$sql, $params] = $builder->buildCount();
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function all(array $filters = [], int $page = 1, int $perPage = 15): array
    {
        $builder = QueryBuilder::table($this->table);
        
        foreach ($filters as $col => $val) {
            $builder->where($col, '=', $val);
        }

        [$sql, $params] = $builder->paginate($page, $perPage)->buildSelect();
        $stmt = DatabaseManager::query($sql, $params);
        
        return $stmt->fetchAll();
    }

    public function create(array $data): int
    {
        foreach (array_keys($data) as $column) {
            $this->assertValidColumnName($column);
        }

        // Backtick-quoted so reserved words (e.g. settings.`key`) don't break the query —
        // safe because assertValidColumnName() already restricts every name to
        // [a-zA-Z_][a-zA-Z0-9_]*, so nothing here can escape the backticks.
        $columns = '`' . implode('`, `', array_keys($data)) . '`';
        $placeholders = ':' . implode(', :', array_keys($data));

        $sql = "INSERT INTO {$this->table} ($columns) VALUES ($placeholders)";
        DatabaseManager::query($sql, $data);

        return (int) DatabaseManager::getLastInsertId();
    }

    protected function assertValidColumnName(string $column): void
    {
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $column)) {
            throw new \InvalidArgumentException("Invalid column name: {$column}");
        }
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        foreach (array_keys($data) as $key) {
            $this->assertValidColumnName($key);
            $fields[] = "`{$key}` = :{$key}";
        }
        $fieldsStr = implode(', ', $fields);

        $sql = "UPDATE {$this->table} SET {$fieldsStr} WHERE id = :_id_";
        $params = array_merge($data, ['_id_' => $id]);

        $stmt = DatabaseManager::query($sql, $params);
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $params = ['id' => $id];

        $stmt = DatabaseManager::query($sql, $params);
        return $stmt->rowCount() > 0;
    }
}
