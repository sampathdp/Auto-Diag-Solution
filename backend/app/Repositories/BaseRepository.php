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
        $columns = implode(', ', array_keys($data));
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
            $fields[] = "{$key} = :{$key}";
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
