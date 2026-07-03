<?php

declare(strict_types=1);

namespace App\Repositories;

class BusinessHoursRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('salon_business_hours');
    }

    public function getBySalon(int $salonId): array
    {
        $sql = "SELECT * FROM salon_business_hours WHERE salon_id = :salon_id ORDER BY day_of_week ASC";
        return \App\Core\Database\DatabaseManager::query($sql, ['salon_id' => $salonId])->fetchAll();
    }

    public function upsert(int $salonId, int $day, array $data): bool
    {
        $existing = \App\Core\Database\DatabaseManager::query(
            "SELECT id FROM salon_business_hours WHERE salon_id = :salon_id AND day_of_week = :day",
            ['salon_id' => $salonId, 'day' => $day]
        )->fetch();

        $data['salon_id'] = $salonId;
        $data['day_of_week'] = $day;

        if ($existing) {
            return $this->update((int)$existing['id'], $data);
        } else {
            return $this->create($data) > 0;
        }
    }
}
