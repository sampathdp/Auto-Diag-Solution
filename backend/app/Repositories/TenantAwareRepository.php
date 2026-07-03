<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Auth\TenantContext;
use App\Core\Database\DatabaseManager;
use App\Core\Database\QueryBuilder;
use Exception;

abstract class TenantAwareRepository extends BaseRepository
{
    public function __construct(string $table)
    {
        parent::__construct($table);
    }

    /**
     * Override find to always include salon isolation
     */
    public function find(int $id): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE id = :id";
        $params = ['id' => $id];

        if (!TenantContext::isSuperAdmin()) {
            $salonId = TenantContext::getTenantId();
            if (!$salonId) throw new Exception("Tenant context missing.");
            
            $sql .= " AND salon_id = :salon_id";
            $params['salon_id'] = $salonId;
        }

        $stmt = DatabaseManager::query($sql, $params);
        return $stmt->fetch() ?: null;
    }

    /**
     * Override all to automatically scope the QueryBuilder
     */
    public function all(array $filters = [], int $page = 1, int $perPage = 15): array
    {
        $builder = QueryBuilder::table($this->table);
        
        if (!TenantContext::isSuperAdmin()) {
            $salonId = TenantContext::getTenantId();
            if (!$salonId) throw new Exception("Tenant context missing.");
            $builder->where('salon_id', '=', $salonId);
        }

        foreach ($filters as $col => $val) {
            $builder->where($col, '=', $val);
        }

        [$sql, $params] = $builder->paginate($page, $perPage)->buildSelect();
        $stmt = DatabaseManager::query($sql, $params);
        
        return $stmt->fetchAll();
    }

    /**
     * Override create to automatically inject the salon_id
     */
    public function create(array $data): int
    {
        if (!TenantContext::isSuperAdmin()) {
            $salonId = TenantContext::getTenantId();
            if (!$salonId) throw new Exception("Tenant context missing.");
            $data['salon_id'] = $salonId;
        }

        return parent::create($data);
    }

    /**
     * Delete scoped to tenant
     */
    public function delete(int $id): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $params = ['id' => $id];

        if (!TenantContext::isSuperAdmin()) {
            $salonId = TenantContext::getTenantId();
            $sql .= " AND salon_id = :salon_id";
            $params['salon_id'] = $salonId;
        }

        $stmt = DatabaseManager::query($sql, $params);
        return $stmt->rowCount() > 0;
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        foreach (array_keys($data) as $key) {
            $this->assertValidColumnName($key);
            $fields[] = "{$key} = :{$key}";
        }
        $fieldsStr = implode(', ', $fields);
        
        $sql = "UPDATE {$this->table} SET {$fieldsStr} WHERE id = :_id_";
        $params = array_merge($data, ['_id_' => $id]);

        if (!TenantContext::isSuperAdmin()) {
            $salonId = TenantContext::getTenantId();
            if (!$salonId) throw new Exception("Tenant context missing.");
            
            $sql .= " AND salon_id = :__tenant_scope_id__";
            $params['__tenant_scope_id__'] = $salonId;
        }

        $stmt = DatabaseManager::query($sql, $params);
        return $stmt->rowCount() > 0;
    }
}
