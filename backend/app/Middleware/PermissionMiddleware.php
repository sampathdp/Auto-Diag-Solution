<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Services\PermissionService;
use App\Core\Auth\TenantContext;

class PermissionMiddleware
{
    private string $requiredPermission;
    private PermissionService $permissionService;

    public function __construct(string $requiredPermission)
    {
        $this->requiredPermission = $requiredPermission;
        $this->permissionService = new PermissionService();
    }

    public function handle(Request $request): void
    {
        // 1. Super Admin Bypass
        if (TenantContext::isSuperAdmin() || $request->user->role === 'super_admin') {
            return;
        }

        // 2. Salon owners have full access to their own salon's routes
        if (in_array($request->user->role, ['salon_owner', 'admin'], true)) {
            return;
        }

        // 3. Check JWT permissions (set at login from staff_permissions / plan / custom)
        $userPermissions = $request->user->permissions ?? [];

        if (!$this->permissionService->hasPermission($userPermissions, $this->requiredPermission)) {
            Response::error("Forbidden: Missing permission [{$this->requiredPermission}]", null, 403);
        }
    }
}
