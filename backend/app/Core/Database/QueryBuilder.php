<?php

declare(strict_types=1);

namespace App\Core\Database;

class QueryBuilder
{
    private string $table;
    private array $where = [];
    private array $params = [];
    private array $orderBy = [];
    private ?int $limit = null;
    private ?int $offset = null;

    public function __construct(string $table)
    {
        $this->table = $table;
    }

    public static function table(string $table): self
    {
        return new self($table);
    }

    public function where(string $column, string $operator, mixed $value): self
    {
        $paramName = ":" . str_replace('.', '_', $column) . "_" . count($this->params);
        $this->where[] = "$column $operator $paramName";
        $this->params[$paramName] = $value;
        return $this;
    }

    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_.]*$/', $column)) {
            throw new \InvalidArgumentException("Invalid column name for orderBy: {$column}");
        }
        $direction = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';
        $this->orderBy[] = "$column $direction";
        return $this;
    }

    public function paginate(int $page, int $perPage = 15): self
    {
        $this->limit = $perPage;
        $this->offset = ($page - 1) * $perPage;
        return $this;
    }

    public function buildSelect(): array
    {
        $sql = "SELECT * FROM {$this->table}";

        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(" AND ", $this->where);
        }

        if (!empty($this->orderBy)) {
            $sql .= " ORDER BY " . implode(", ", $this->orderBy);
        }

        if ($this->limit !== null) {
            $sql .= " LIMIT {$this->limit} OFFSET {$this->offset}";
        }

        return [$sql, $this->params];
    }
}
