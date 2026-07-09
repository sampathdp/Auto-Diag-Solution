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

    private const ALLOWED_OPERATORS = ['=', '!=', '<>', '<', '<=', '>', '>=', 'LIKE', 'NOT LIKE'];

    /**
     * Backtick-quotes a validated `column` or `table.column` reference so reserved
     * words (e.g. settings.`key`) never break generated SQL.
     */
    private function quoteIdentifier(string $column): string
    {
        return '`' . str_replace('.', '`.`', $column) . '`';
    }

    public function where(string $column, string $operator, mixed $value): self
    {
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_.]*$/', $column)) {
            throw new \InvalidArgumentException("Invalid column name for where(): {$column}");
        }

        if (!in_array(strtoupper($operator), self::ALLOWED_OPERATORS, true)) {
            throw new \InvalidArgumentException("Invalid operator for where(): {$operator}");
        }

        $paramName = ":" . str_replace('.', '_', $column) . "_" . count($this->params);
        $this->where[] = $this->quoteIdentifier($column) . " $operator $paramName";
        $this->params[$paramName] = $value;
        return $this;
    }

    /**
     * Multi-column "search box" condition: (col1 LIKE %term% OR col2 LIKE %term% OR ...).
     * Each column gets its own placeholder bound to the same value — MySQL's native
     * prepared statements (ATTR_EMULATE_PREPARES=false, as this app runs) reject reusing
     * one named placeholder twice in a single query.
     */
    public function whereSearch(array $columns, string $term): self
    {
        if ($term === '' || empty($columns)) {
            return $this;
        }

        $likeValue = '%' . $term . '%';
        $conditions = [];
        foreach ($columns as $column) {
            if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_.]*$/', $column)) {
                throw new \InvalidArgumentException("Invalid column name for whereSearch(): {$column}");
            }
            $paramName = ":search_" . str_replace('.', '_', $column) . "_" . count($this->params);
            $conditions[] = $this->quoteIdentifier($column) . " LIKE $paramName";
            $this->params[$paramName] = $likeValue;
        }

        $this->where[] = '(' . implode(' OR ', $conditions) . ')';
        return $this;
    }

    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_.]*$/', $column)) {
            throw new \InvalidArgumentException("Invalid column name for orderBy: {$column}");
        }
        $direction = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';
        $this->orderBy[] = $this->quoteIdentifier($column) . " $direction";
        return $this;
    }

    public function paginate(int $page, int $perPage = 15): self
    {
        $this->limit = $perPage;
        $this->offset = ($page - 1) * $perPage;
        return $this;
    }

    private function whereClause(): string
    {
        return !empty($this->where) ? " WHERE " . implode(" AND ", $this->where) : '';
    }

    public function buildSelect(): array
    {
        $sql = "SELECT * FROM {$this->table}" . $this->whereClause();

        if (!empty($this->orderBy)) {
            $sql .= " ORDER BY " . implode(", ", $this->orderBy);
        }

        if ($this->limit !== null) {
            $sql .= " LIMIT {$this->limit} OFFSET {$this->offset}";
        }

        return [$sql, $this->params];
    }

    /**
     * Same accumulated WHERE conditions as buildSelect(), for the matching
     * "how many pages of results" COUNT query — ignores orderBy/limit/offset.
     */
    public function buildCount(): array
    {
        return ["SELECT COUNT(*) AS c FROM {$this->table}" . $this->whereClause(), $this->params];
    }
}
