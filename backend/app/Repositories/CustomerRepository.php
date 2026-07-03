<?php

declare(strict_types=1);

namespace App\Repositories;

class CustomerRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('customers');
    }

    public function allForBranch(?int $branchId, int $page = 1, int $perPage = 50): array
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        $sql    = "SELECT * FROM customers WHERE salon_id = :salon_id";
        $params = ['salon_id' => $salonId];

        if ($branchId !== null) {
            $sql .= " AND (branch_id = :branch_id OR branch_id IS NULL)";
            $params['branch_id'] = $branchId;
        }

        $sql .= " ORDER BY name ASC LIMIT :limit OFFSET :offset";
        $params['limit']  = $perPage;
        $params['offset'] = ($page - 1) * $perPage;

        return \App\Core\Database\DatabaseManager::query($sql, $params)->fetchAll();
    }
}
