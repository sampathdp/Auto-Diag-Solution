<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class InventoryTransactionRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('inventory_transactions');
    }

    public function getLogs(int $productId = null, int $branchId = null): array
    {
        $sql = "SELECT it.*, p.name as product_name 
                FROM inventory_transactions it
                JOIN products p ON it.product_id = p.id
                WHERE it.salon_id = :salon_id";
        
        $params = ['salon_id' => \App\Core\Auth\TenantContext::getTenantId()];

        if ($productId) {
            $sql .= " AND it.product_id = :product_id";
            $params['product_id'] = $productId;
        }

        if ($branchId !== null) {
            $sql .= " AND it.branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }

        $sql .= " ORDER BY it.created_at DESC";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }
}
