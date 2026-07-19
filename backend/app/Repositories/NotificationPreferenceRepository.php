<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class NotificationPreferenceRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('notification_preferences');
    }

    public function findByUser(int $userId): ?array
    {
        return $this->findBy('user_id', $userId);
    }

    /** Rows are created lazily on first read/write — every user has implicit defaults until then. */
    public function getOrCreateForUser(int $userId): array
    {
        $row = $this->findByUser($userId);
        if ($row) {
            return $row;
        }

        $this->create(['user_id' => $userId]);
        return $this->findByUser($userId);
    }

    public function upsertForUser(int $userId, array $fields): array
    {
        $existing = $this->findByUser($userId);
        if ($existing) {
            $this->update((int)$existing['id'], $fields);
        } else {
            $this->create(array_merge(['user_id' => $userId], $fields));
        }
        return $this->findByUser($userId);
    }
}
