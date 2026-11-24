<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Services\PermissionService;

/**
 * Usage in routes: [PermissionMiddleware::class, 'b2b.credit.manage']
 *
 * Checks the database on every request instead of trusting the JWT's permissions
 * claim, so revoking a permission (or deactivating an admin) takes effect immediately.
 * Only super admins bypass — the plain admin role is no longer enough on its own.
 */
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
        if (!isset($request->user)) {
            Response::error('Unauthorized: authentication required', null, 401);
        }

        if (!$this->permissionService->userHas((int)$request->user->id, $this->requiredPermission)) {
            Response::error("Forbidden: Missing permission [{$this->requiredPermission}]", null, 403);
        }
    }
}
