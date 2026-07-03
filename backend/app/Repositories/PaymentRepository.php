<?php

declare(strict_types=1);

namespace App\Repositories;

class PaymentRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('salon_payment_methods');
    }

    public function getPaymentMethods(int $salonId): array
    {
        $sql = "SELECT * FROM salon_payment_methods WHERE salon_id = :salon_id";
        return \App\Core\Database\DatabaseManager::query($sql, ['salon_id' => $salonId])->fetchAll();
    }

    public function updateMethod(int $salonId, string $method, array $data): bool
    {
        $existing = \App\Core\Database\DatabaseManager::query(
            "SELECT id FROM salon_payment_methods WHERE salon_id = :salon_id AND method_key = :method",
            ['salon_id' => $salonId, 'method' => $method]
        )->fetch();

        if ($existing) {
            return $this->update((int)$existing['id'], $data);
        } else {
            $data['salon_id'] = $salonId;
            $data['method_key'] = $method;
            return $this->create($data) > 0;
        }
    }
}
