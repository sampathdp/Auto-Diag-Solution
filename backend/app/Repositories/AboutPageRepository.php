<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class AboutPageRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('about_page');
    }

    // Singleton content — always exactly one row.
    public function getSingleton(): ?array
    {
        $stmt = DatabaseManager::query("SELECT * FROM about_page ORDER BY id ASC LIMIT 1");
        return $stmt->fetch() ?: null;
    }
}
