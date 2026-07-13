<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class MediaRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('media');
    }

    /** id => path, for resolving a product's `images` (array of media ids) in one query. */
    public function pathsForIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $rows = DatabaseManager::query(
            "SELECT id, path FROM media WHERE id IN ($placeholders)",
            array_values($ids)
        )->fetchAll();

        $map = [];
        foreach ($rows as $row) {
            $map[(int)$row['id']] = $row['path'];
        }
        return $map;
    }
}
