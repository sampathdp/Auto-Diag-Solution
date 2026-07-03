<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Core\Database\DatabaseManager;

abstract class Seeder
{
    abstract public function run(): void;

    protected function insert(string $table, array $data): void
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        $sql = "INSERT INTO $table ($columns) VALUES ($placeholders)";
        DatabaseManager::query($sql, $data);
    }
}
