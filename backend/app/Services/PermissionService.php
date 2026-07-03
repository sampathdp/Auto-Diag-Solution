<?php

declare(strict_types=1);

namespace App\Services;

class PermissionService extends BaseService
{
    /**
     * Check if a specific permission string matches any of the user's permissions.
     * Supports wildcards like 'appointments.*'
     */
    public function hasPermission(array $userPermissions, string $requiredPermission): bool
    {
        foreach ($userPermissions as $permission) {
            if ($permission === $requiredPermission || $permission === '*') {
                return true;
            }

            // Handle Wildcard (e.g. 'appointments.*' matches 'appointments.create')
            if (str_contains($permission, '*')) {
                $pattern = str_replace('*', '.*', $permission);
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
}
