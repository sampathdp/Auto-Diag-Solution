<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class SettingRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('settings');
    }

    public function allGrouped(): array
    {
        return DatabaseManager::query("SELECT * FROM settings ORDER BY group_name, `key`")->fetchAll();
    }

    public function findByKey(string $key): ?array
    {
        return $this->findBy('key', $key);
    }

    public function updateByKey(string $key, string $value): void
    {
        DatabaseManager::query("UPDATE settings SET value = :value WHERE `key` = :key", ['value' => $value, 'key' => $key]);
    }

    public function deleteByKey(string $key): void
    {
        DatabaseManager::query("DELETE FROM settings WHERE `key` = :key", ['key' => $key]);
    }
}
