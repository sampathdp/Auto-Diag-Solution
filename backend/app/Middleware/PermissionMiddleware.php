<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Services\PermissionService;

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
        // Admins bypass all permission checks
        if ($request->user->role === 'admin') {
            return;
        }

        // Check JWT-embedded permissions
        $userPermissions = $request->user->permissions ?? [];

        if (!$this->permissionService->hasPermission($userPermissions, $this->requiredPermission)) {
            Response::error("Forbidden: Missing permission [{$this->requiredPermission}]", null, 403);
        }
    }
}
