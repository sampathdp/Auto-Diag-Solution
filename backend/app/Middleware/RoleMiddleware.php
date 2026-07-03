<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

class RoleMiddleware
{
    private array $allowedRoles;

    public function __construct(array $allowedRoles)
    {
        $this->allowedRoles = $allowedRoles;
    }

    public function handle(Request $request): void
    {
        if (!isset($request->user) || !in_array($request->user->role, $this->allowedRoles)) {
            Response::error('Forbidden: Insufficient permissions (Role required)', null, 403);
        }
    }
}
