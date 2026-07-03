<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class UserPermissionRepository extends TenantAwareRepository
{
    private static array $localCache = [];

    public function __construct()
    {
        parent::__construct('user_permissions');
    }

    /**
     * Get all permission keys for a specific user
     */
    public function getPermissionsForUser(int $userId): array
    {
        // Simple in-memory cache for the current request
        if (isset(self::$localCache[$userId])) {
            return self::$localCache[$userId];
        }

        $sql = "SELECT p.permission_key FROM permissions p
                JOIN user_permissions up ON p.id = up.permission_id
                WHERE up.user_id = :user_id AND up.allowed = 1";
        
        // Note: salon_id scoping is handled by the JOIN/context if needed, 
        // but here we fetch all active keys for the user.
        $stmt = DatabaseManager::query($sql, ['user_id' => $userId]);
        $permissions = $stmt->fetchAll(\PDO::FETCH_COLUMN);

        self::$localCache[$userId] = $permissions ?: [];
        return self::$localCache[$userId];
    }
}
