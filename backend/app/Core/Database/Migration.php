<?php

declare(strict_types=1);

namespace App\Core\Database;

abstract class Migration
{
    abstract public function up(): void;
    abstract public function down(): void;

    protected function execute(string $sql): void
    {
        DatabaseManager::query($sql);
    }
}
