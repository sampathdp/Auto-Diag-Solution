<?php

declare(strict_types=1);

namespace App\Repositories;

class StaffRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('staff');
    }

    public function allWithUser(): array
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        $branchId = \App\Core\Auth\TenantContext::getBranchId();

        $sql = "SELECT s.*, u.name, u.email, u.is_active,
                       (SELECT b.name FROM branches b WHERE b.id = s.branch_id) as branch_name 
                FROM staff s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.salon_id = :salon_id";
        
        $params = ['salon_id' => $salonId];

        // Branch-scoped users see their branch + shared staff (NULL branch).
        // Salon owners (branch_id = NULL) see all staff.
        if ($branchId !== null) {
            $sql .= " AND (s.branch_id = :branch_id OR s.branch_id IS NULL)";
            $params['branch_id'] = $branchId;
        }

        $rows = \App\Core\Database\DatabaseManager::query($sql, $params)->fetchAll();
        foreach ($rows as &$r) {
            $r['is_active']          = (int)($r['is_active']          ?? 1);
            $r['salary']             = (float)($r['salary']            ?? 0);
            $r['commission_enabled'] = (int)($r['commission_enabled']  ?? 1);
        }
        unset($r);
        return $rows;
    }
}
