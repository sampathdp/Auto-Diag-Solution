<?php

declare(strict_types=1);

namespace App\Repositories;

class PaymentProofRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('payment_proofs');
    }

    public function getPendingProofs(int $salonId): array
    {
        $sql = "SELECT p.*, a.appointment_date, a.start_time, a.payment_method, c.name as customer_name 
                FROM payment_proofs p
                JOIN appointments a ON p.appointment_id = a.id
                JOIN customers c ON a.customer_id = c.id
                WHERE p.salon_id = :salon_id AND p.status = 'pending'";
        return \App\Core\Database\DatabaseManager::query($sql, ['salon_id' => $salonId])->fetchAll();
    }

    public function getProofHistory(int $salonId): array
    {
        $sql = "SELECT p.*, a.appointment_date, a.start_time, a.payment_method, c.name as customer_name, u.name as verified_by_name
                FROM payment_proofs p
                JOIN appointments a ON p.appointment_id = a.id
                JOIN customers c ON a.customer_id = c.id
                LEFT JOIN users u ON p.verified_by = u.id
                WHERE p.salon_id = :salon_id AND p.status != 'pending'
                ORDER BY p.created_at DESC";
        return \App\Core\Database\DatabaseManager::query($sql, ['salon_id' => $salonId])->fetchAll();
    }
}
