<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class HomePageRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('home_page');
    }

    // Singleton content — always exactly one row.
    public function getSingleton(): ?array
    {
        $stmt = DatabaseManager::query("SELECT * FROM home_page ORDER BY id ASC LIMIT 1");
        return $stmt->fetch() ?: null;
    }
}
