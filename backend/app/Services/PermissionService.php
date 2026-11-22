<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Support\Permissions;

class PermissionService extends BaseService
{
    /** @var array<int, array{super:bool, permissions:string[]}> per-request cache */
    private static array $cache = [];

    /**
     * Check if a specific permission string matches any of the user's permissions.
     * Supports wildcards like 'b2b.*'
     */
    public function hasPermission(array $userPermissions, string $requiredPermission): bool
    {
        foreach ($userPermissions as $permission) {
            if ($permission === $requiredPermission || $permission === '*') {
                return true;
            }

            // Handle wildcard (e.g. 'b2b.*' matches 'b2b.credit.manage'). preg_quote first so
            // the dots in a permission string are literal, not "any character".
            if (str_contains($permission, '*')) {
                $pattern = str_replace('\*', '.*', preg_quote($permission, '/'));
                if (preg_match('/^' . $pattern . '$/', $requiredPermission)) {
                    return true;
                }
            }
        }

        return false;
    }

    public function hasAnyPermission(array $userPermissions, array $requiredPermissions): bool
    {
        foreach ($requiredPermissions as $perm) {
            if ($this->hasPermission($userPermissions, $perm)) {
                return true;
            }
        }
        return false;
    }

    public function hasAllPermissions(array $userPermissions, array $requiredPermissions): bool
    {
        foreach ($requiredPermissions as $perm) {
            if (!$this->hasPermission($userPermissions, $perm)) {
                return false;
            }
        }
        return true;
    }

    /**
     * The user's effective permissions, read from the database (never from the JWT).
     * Super admins get ['*']; other active admins get their granted rows; everyone else [].
     *
     * @return string[]
     */
    public function forUser(int $userId): array
    {
        $state = $this->load($userId);
        return $state['super'] ? ['*'] : $state['permissions'];
    }

    public function isSuperAdmin(int $userId): bool
    {
        return $this->load($userId)['super'];
    }

    /** Fresh database check, used by PermissionMiddleware and by financial services. */
    public function userHas(int $userId, string $permission): bool
    {
        return $this->hasPermission($this->forUser($userId), $permission);
    }

    /** Throws a 403 DomainException unless the user holds the permission. */
    public function authorize(int $userId, string $permission): void
    {
        if (!$this->userHas($userId, $permission)) {
            throw new DomainException("You don't have permission to do this ({$permission})", 403);
        }
    }

    /**
     * Replaces a user's granted permissions. Unknown keys are rejected rather than
     * silently stored, so a typo can't create a permission nothing checks.
     * Caller owns the transaction.
     *
     * @param string[] $permissions
     */
    public function syncPermissions(int $userId, array $permissions, int $grantedBy): void
    {
        $permissions = array_values(array_unique(array_map('strval', $permissions)));
        foreach ($permissions as $p) {
            if (!Permissions::isKnown($p)) {
                throw new DomainException("Unknown permission: {$p}", 422);
            }
        }

        DatabaseManager::query("DELETE FROM user_permissions WHERE user_id = :id", ['id' => $userId]);
        foreach ($permissions as $p) {
            DatabaseManager::query(
                "INSERT INTO user_permissions (user_id, permission, granted_by) VALUES (:user_id, :permission, :granted_by)",
                ['user_id' => $userId, 'permission' => $p, 'granted_by' => $grantedBy]
            );
        }
        $this->forget($userId);
    }

    /** @return string[] the raw granted rows (ignores super-admin status) */
    public function grantedRows(int $userId): array
    {
        $rows = DatabaseManager::query(
            "SELECT permission FROM user_permissions WHERE user_id = :id ORDER BY permission",
            ['id' => $userId]
        )->fetchAll(\PDO::FETCH_COLUMN);
        return array_map('strval', $rows);
    }

    public function forget(int $userId): void
    {
        unset(self::$cache[$userId]);
    }

    /** @return array{super:bool, permissions:string[]} */
    private function load(int $userId): array
    {
        if (isset(self::$cache[$userId])) {
            return self::$cache[$userId];
        }

        try {
            $user = DatabaseManager::query(
                "SELECT role, is_super_admin, is_active FROM users WHERE id = :id LIMIT 1",
                ['id' => $userId]
            )->fetch();
        } catch (\PDOException $e) {
            // Code deployed but the 2026_11_22 migrations not run yet (users.is_super_admin
            // missing). Keep the pre-migration behaviour (every active admin can do
            // everything) so admin login keeps working until `php console.php migrate` runs.
            error_log('PermissionService: falling back to legacy admin check: ' . $e->getMessage());
            $user = DatabaseManager::query(
                "SELECT role, is_active, 1 AS is_super_admin FROM users WHERE id = :id LIMIT 1",
                ['id' => $userId]
            )->fetch();
        }

        if (!$user || (int)$user['is_active'] !== 1 || $user['role'] !== 'admin') {
            return self::$cache[$userId] = ['super' => false, 'permissions' => []];
        }

        if ((int)$user['is_super_admin'] === 1) {
            return self::$cache[$userId] = ['super' => true, 'permissions' => ['*']];
        }

        return self::$cache[$userId] = ['super' => false, 'permissions' => $this->grantedRows($userId)];
    }
}
