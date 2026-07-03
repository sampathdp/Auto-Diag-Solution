<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class ServiceRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('services');
    }

    /**
     * Fetch services with category information
     */
    public function allWithCategory(array $filters, int $page, int $perPage): array
    {
        $sql = "SELECT s.*, c.name as category_name FROM services s
                LEFT JOIN service_categories c ON s.category_id = c.id
                WHERE s.salon_id = :salon_id";
        
        $params = ['salon_id' => \App\Core\Auth\TenantContext::getTenantId()];
        
        $stmt = DatabaseManager::query($sql, $params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['is_active'] = (int)$r['is_active'];
            $r['price']     = (float)$r['price'];
        }
        unset($r);
        return $rows;
    }
}
