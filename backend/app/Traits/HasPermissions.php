<?php

declare(strict_types=1);

namespace App\Traits;

use App\Repositories\UserPermissionRepository;
use App\Services\PermissionService;

trait HasPermissions
{
    protected array $permissions = [];
    protected bool $permissionsLoaded = false;

    public function hasPermission(string $permission): bool
    {
        if ($this->role === 'super_admin') return true;

        $this->loadPermissions();
        $service = new PermissionService();
        return $service->hasPermission($this->permissions, $permission);
    }

    private function loadPermissions(): void
    {
        if (!$this->permissionsLoaded) {
            $repo = new UserPermissionRepository();
            $this->permissions = $repo->getPermissionsForUser((int)$this->id);
            $this->permissionsLoaded = true;
        }
    }
}
