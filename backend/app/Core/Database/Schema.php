<?php

declare(strict_types=1);

namespace App\Core\Database;

class Schema
{
    private string $table;
    private array $columns = [];
    private array $indexes = [];
    private array $foreignKeys = [];

    public function __construct(string $table)
    {
        $this->table = $table;
    }

    public static function create(string $table, callable $callback): string
    {
        $schema = new self($table);
        $callback($schema);
        return $schema->buildCreate();
    }

    public function id(): void
    {
        $this->columns[] = "id BIGINT PRIMARY KEY AUTO_INCREMENT";
    }

    public function string(string $name, int $length = 255, bool $nullable = false, bool $unique = false): void
    {
        $col = "$name VARCHAR($length)" . ($nullable ? " NULL" : " NOT NULL");
        if ($unique) $col .= " UNIQUE";
        $this->columns[] = $col;
    }

    public function text(string $name, bool $nullable = true): void
    {
        $this->columns[] = "$name TEXT" . ($nullable ? " NULL" : " NOT NULL");
    }

    public function enum(string $name, array $values, string $default = null): void
    {
        $vals = "'" . implode("','", $values) . "'";
        $col = "$name ENUM($vals)" . ($default ? " DEFAULT '$default'" : "");
        $this->columns[] = $col;
    }

    public function boolean(string $name, bool $default = true): void
    {
        $this->columns[] = "$name BOOLEAN DEFAULT " . ($default ? "TRUE" : "FALSE");
    }

    public function foreignId(string $name): void
    {
        $this->columns[] = "$name BIGINT NOT NULL";
    }

    public function timestamps(): void
    {
        $this->columns[] = "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        $this->columns[] = "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
    }

    public function foreign(string $column, string $references, string $on, string $onDelete = 'CASCADE'): void
    {
        $this->foreignKeys[] = "CONSTRAINT fk_{$this->table}_{$column} FOREIGN KEY ($column) REFERENCES $on($references) ON DELETE $onDelete";
    }

    private function buildCreate(): string
    {
        $sql = "CREATE TABLE IF NOT EXISTS {$this->table} (\n    " . implode(",\n    ", $this->columns);
        if (!empty($this->foreignKeys)) {
            $sql .= ",\n    " . implode(",\n    ", $this->foreignKeys);
        }
        $sql .= "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        return $sql;
    }

    public static function drop(string $table): string
    {
        return "DROP TABLE IF EXISTS $table;";
    }
}
