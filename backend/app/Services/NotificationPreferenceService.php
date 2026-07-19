<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\NotificationPreferenceRepository;

class NotificationPreferenceService
{
    private const FIELDS = [
        'email_orders', 'email_promotions', 'sms_orders',
        'sms_promotions', 'whatsapp_updates', 'push_notifications',
    ];

    private NotificationPreferenceRepository $repo;

    public function __construct()
    {
        $this->repo = new NotificationPreferenceRepository();
    }

    public function get(int $userId): array
    {
        return $this->shape($this->repo->getOrCreateForUser($userId));
    }

    public function update(int $userId, array $input): array
    {
        $fields = [];
        foreach (self::FIELDS as $field) {
            if (array_key_exists($field, $input)) {
                $fields[$field] = !empty($input[$field]) ? 1 : 0;
            }
        }
        $row = $this->repo->upsertForUser($userId, $fields);
        return $this->shape($row);
    }

    private function shape(array $row): array
    {
        $out = [];
        foreach (self::FIELDS as $field) {
            $out[$field] = (bool)$row[$field];
        }
        return $out;
    }
}
