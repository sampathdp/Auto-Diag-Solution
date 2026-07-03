<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class AppointmentRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('appointments');
    }

    /**
     * Fetch appointments for a date range
     */
    public function getInRange(string $start, string $end, ?int $branchId = null): array
    {
        $sql = "SELECT a.id, a.salon_id, a.branch_id, a.appointment_date, a.start_time, a.end_time, a.status, a.total_amount, a.notes, a.actual_start_time, a.actual_end_time,
                       (SELECT name FROM customers WHERE id = a.customer_id) as customer_name,
                       (SELECT phone FROM customers WHERE id = a.customer_id) as customer_phone,
                       (SELECT email FROM customers WHERE id = a.customer_id) as customer_email,
                       (SELECT u.name FROM users u JOIN staff st ON u.id = st.user_id WHERE st.id = a.staff_id) as staff_name,
                       (SELECT GROUP_CONCAT(s.name) FROM services s JOIN appointment_services aps ON s.id = aps.service_id WHERE aps.appointment_id = a.id) as service_name,
                       (SELECT name FROM branches WHERE id = a.branch_id) as branch_name,
                       'appointment' as type
                FROM appointments a
                WHERE a.salon_id = :salon_id 
                AND a.appointment_date >= :start AND a.appointment_date <= :end";
        
        if ($branchId !== null) {
            $sql .= " AND (a.branch_id = :branch_id OR a.branch_id IS NULL)";
        }

        $sql .= " UNION ALL
                
                SELECT b.id, b.salon_id, NULL as branch_id, b.block_date as appointment_date, b.start_time, b.end_time, 'blocked' as status, 0 as total_amount, b.reason as notes, NULL as actual_start_time, NULL as actual_end_time,
                       'Salon Blocked' as customer_name,
                       NULL as customer_phone,
                       NULL as customer_email,
                       (SELECT u.name FROM users u JOIN staff st ON u.id = st.user_id WHERE st.id = b.staff_id) as staff_name,
                       'Blocked Time' as service_name,
                       NULL as branch_name,
                       'block' as type
                FROM salon_blocked_times b
                WHERE b.salon_id = :salon_id2
                AND b.block_date >= :start2 AND b.block_date <= :end2";

        if ($branchId !== null) {
            $sql .= " AND (b.staff_id IS NULL OR (SELECT branch_id FROM staff WHERE id = b.staff_id) = :branch_id2 OR (SELECT branch_id FROM staff WHERE id = b.staff_id) IS NULL)";
        }

        $params = [
            'salon_id' => \App\Core\Auth\TenantContext::getTenantId(),
            'start' => $start,
            'end' => $end,
            'salon_id2' => \App\Core\Auth\TenantContext::getTenantId(),
            'start2' => $start,
            'end2' => $end
        ];

        if ($branchId !== null) {
            $params['branch_id'] = $branchId;
            $params['branch_id2'] = $branchId;
        }
        
        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    /**
     * Check if a staff member has an overlapping appointment
     */
    public function hasOverlap(int $staffId, string $date, string $start, string $end, ?int $excludeId = null): bool
    {
        $sql = "SELECT COUNT(*) FROM appointments 
                WHERE staff_id = :staff_id AND appointment_date = :date 
                AND status NOT IN ('cancelled', 'no_show')
                AND ((start_time < :end AND end_time > :start))";
        
        $params = [
            'staff_id' => $staffId,
            'date' => $date,
            'start' => $start,
            'end' => $end
        ];

        if ($excludeId) {
            $sql .= " AND id != :exclude_id";
            $params['exclude_id'] = $excludeId;
        }

        $count = (int)DatabaseManager::query($sql, $params)->fetchColumn();
        return $count > 0;
    }
    /**
     * Fetch appointments for a specific customer
     */
    public function getByCustomer(int $customerId): array
    {
        $sql = "SELECT a.*, 
                       (SELECT name FROM customers WHERE id = a.customer_id) as customer_name,
                       (SELECT u.name FROM users u JOIN staff st ON u.id = st.user_id WHERE st.id = a.staff_id) as staff_name,
                       (SELECT GROUP_CONCAT(s.name) FROM services s JOIN appointment_services aps ON s.id = aps.service_id WHERE aps.appointment_id = a.id) as service_name
                FROM appointments a
                WHERE a.customer_id = :customer_id 
                ORDER BY a.appointment_date DESC, a.start_time DESC";
        
        return DatabaseManager::query($sql, [
            'customer_id' => $customerId
        ])->fetchAll();
    }
}
