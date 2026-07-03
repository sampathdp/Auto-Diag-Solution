<?php

declare(strict_types=1);

namespace App\Repositories;

class ProductRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('products');
    }

    public function allForBranch(?int $branchId): array
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        $sql    = "SELECT * FROM products WHERE salon_id = :salon_id";
        $params = ['salon_id' => $salonId];

        if ($branchId !== null) {
            $sql .= " AND (branch_id = :branch_id OR branch_id IS NULL)";
            $params['branch_id'] = $branchId;
        }

        $sql .= " ORDER BY name ASC";
        return \App\Core\Database\DatabaseManager::query($sql, $params)->fetchAll();
    }
}
