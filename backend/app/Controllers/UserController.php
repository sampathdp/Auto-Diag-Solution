<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database\DatabaseManager;
use App\Core\Request;
use App\Repositories\UserRepository;
use App\Services\AdminActivityLogger;
use App\Services\PermissionService;
use App\Support\Permissions;

class UserController extends BaseController
{
    // Roles a caller of these (admin-only) endpoints is allowed to assign.
    // Kept as an explicit allow-list rather than trusting the request body directly.
    private const ASSIGNABLE_ROLES = ['admin', 'customer'];

    private UserRepository $userRepo;
    private PermissionService $permissions;

    public function __construct()
    {
        $this->userRepo = new UserRepository();
        $this->permissions = new PermissionService();
    }

    /**
     * A super admin account can only be changed by another super admin, so someone
     * holding just staff.manage can't take over (or lock out) the owners of the system.
     */
    private function guardSuperAdminTarget(Request $request, array $target): bool
    {
        if ((int)($target['is_super_admin'] ?? 0) === 1 && !$this->permissions->isSuperAdmin((int)$request->user->id)) {
            $this->error('Only a super admin can change a super admin account', null, 403);
            return false;
        }
        return true;
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        // Cap per_page so a caller can't force an unbounded full-table scan.
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));

        $filters = [];
        $role = (string)($request->input('role') ?? '');
        if (in_array($role, self::ASSIGNABLE_ROLES, true)) {
            $filters['role'] = $role;
        }

        $users = $this->userRepo->all($filters, $page, $perPage);
        foreach ($users as &$user) {
            // two_factor_secret is a live TOTP seed — never serialize it, even to an admin.
            unset($user['password'], $user['two_factor_secret']);
        }

        $this->success($users);
    }

    public function store(Request $request): void
    {
        $data = $request->all();

        $email = strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        $name = trim((string)($data['name'] ?? ''));
        $role = (string)($data['role'] ?? 'customer');

        if ($email === '' || $password === '' || $name === '') {
            $this->error('Name, email, and password are required', null, 400);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('A valid email address is required', null, 400);
            return;
        }

        if (strlen($password) < 8) {
            $this->error('Password must be at least 8 characters long', null, 400);
            return;
        }

        if (!in_array($role, self::ASSIGNABLE_ROLES, true)) {
            $this->error('Invalid role', null, 400);
            return;
        }

        if ($this->userRepo->findByEmail($email)) {
            $this->error('A user with this email already exists', null, 409);
            return;
        }

        // Explicit whitelist — never spread $request->all() into create().
        $id = $this->userRepo->create([
            'name' => $name,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_BCRYPT),
            'role' => $role,
        ]);

        $this->success(['id' => $id], 'User created successfully', 201);
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $input = $request->all();

        $target = $this->userRepo->find($id);
        if (!$target) {
            $this->error('User not found', null, 404);
            return;
        }
        if (!$this->guardSuperAdminTarget($request, $target)) {
            return;
        }

        // Explicit whitelist — email changes go through a dedicated verified flow later;
        // every other field here is deliberately opted in, not just "everything except id/email".
        $fields = [];

        if (array_key_exists('name', $input)) {
            $name = trim((string)$input['name']);
            if ($name === '') {
                $this->error('Name cannot be empty', null, 400);
                return;
            }
            $fields['name'] = $name;
        }

        if (array_key_exists('role', $input)) {
            if (!in_array($input['role'], self::ASSIGNABLE_ROLES, true)) {
                $this->error('Invalid role', null, 400);
                return;
            }
            if ($id === (int)$request->user->id && $input['role'] !== 'admin') {
                $this->error('You cannot remove your own admin role', null, 400);
                return;
            }
            $fields['role'] = $input['role'];
            if ($input['role'] !== 'admin') {
                // Leaving the admin role drops every admin power with it.
                if ((int)($target['is_super_admin'] ?? 0) === 1) {
                    $others = (int)DatabaseManager::query(
                        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_super_admin = 1 AND is_active = 1 AND id <> :id",
                        ['id' => $id]
                    )->fetchColumn();
                    if ($others === 0) {
                        $this->error('At least one active super admin must remain', null, 400);
                        return;
                    }
                }
                $fields['is_super_admin'] = 0;
                DatabaseManager::query("DELETE FROM user_permissions WHERE user_id = :id", ['id' => $id]);
            }
        }

        if (array_key_exists('is_active', $input)) {
            if ($id === (int)$request->user->id && !$input['is_active']) {
                $this->error('You cannot deactivate your own account', null, 400);
                return;
            }
            $fields['is_active'] = (int)(bool)$input['is_active'];
        }

        if (!empty($input['password'])) {
            if (strlen((string)$input['password']) < 8) {
                $this->error('Password must be at least 8 characters long', null, 400);
                return;
            }
            $fields['password'] = password_hash((string)$input['password'], PASSWORD_BCRYPT);
        }

        if (empty($fields)) {
            $this->error('No valid fields to update', null, 400);
            return;
        }

        $this->userRepo->update($id, $fields);
        $this->permissions->forget($id);
        AdminActivityLogger::log((int)$request->user->id, 'user.updated', 'user', $id, array_diff_key($fields, ['password' => 1]));
        $this->success(null, 'User updated successfully');
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');

        if ($id === (int)$request->user->id) {
            $this->error('You cannot delete your own account', null, 400);
            return;
        }

        $target = $this->userRepo->find($id);
        if (!$target) {
            $this->error('User not found', null, 404);
            return;
        }
        if (!$this->guardSuperAdminTarget($request, $target)) {
            return;
        }

        $this->userRepo->delete($id);
        AdminActivityLogger::log((int)$request->user->id, 'user.deleted', 'user', $id, ['email' => $target['email']]);
        $this->success(null, 'User deleted successfully');
    }

    /** GET /admin/permissions: the grantable permission catalogue. */
    public function permissionCatalogue(Request $request): void
    {
        $this->success(Permissions::catalogue());
    }

    /** GET /admin/users/{id}/permissions */
    public function showPermissions(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $target = $this->userRepo->find($id);
        if (!$target) {
            $this->error('User not found', null, 404);
            return;
        }

        $this->success([
            'user_id' => $id,
            'role' => $target['role'],
            'is_super_admin' => (int)($target['is_super_admin'] ?? 0) === 1,
            'permissions' => $this->permissions->grantedRows($id),
        ]);
    }

    /**
     * PUT /admin/users/{id}/permissions  {is_super_admin?: bool, permissions: string[]}
     *
     * Super admins only, even though the route also sits behind staff.manage: whoever can
     * grant permissions can grant themselves anything, so that power stays with super admins.
     */
    public function updatePermissions(Request $request): void
    {
        $actorId = (int)$request->user->id;
        if (!$this->permissions->isSuperAdmin($actorId)) {
            $this->error('Only a super admin can change permissions', null, 403);
            return;
        }

        $id = (int)$request->getParam('id');
        $target = $this->userRepo->find($id);
        if (!$target) {
            $this->error('User not found', null, 404);
            return;
        }
        if ($target['role'] !== 'admin') {
            $this->error('Permissions can only be given to admin accounts', null, 422);
            return;
        }

        $input = $request->all();
        $permissions = $input['permissions'] ?? [];
        if (!is_array($permissions)) {
            $this->error('permissions must be a list', null, 422);
            return;
        }

        $wasSuper = (int)($target['is_super_admin'] ?? 0) === 1;
        $makeSuper = array_key_exists('is_super_admin', $input) ? (bool)$input['is_super_admin'] : $wasSuper;

        if ($wasSuper && !$makeSuper) {
            if ($id === $actorId) {
                $this->error('You cannot remove your own super admin access', null, 400);
                return;
            }
            $others = (int)DatabaseManager::query(
                "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_super_admin = 1 AND is_active = 1 AND id <> :id",
                ['id' => $id]
            )->fetchColumn();
            if ($others === 0) {
                $this->error('At least one active super admin must remain', null, 400);
                return;
            }
        }

        $before = $this->permissions->grantedRows($id);

        DatabaseManager::beginTransaction();
        try {
            $this->userRepo->update($id, ['is_super_admin' => $makeSuper ? 1 : 0]);
            $this->permissions->syncPermissions($id, $permissions, $actorId);
            AdminActivityLogger::log($actorId, 'user.permissions_changed', 'user', $id, [
                'is_super_admin' => ['from' => $wasSuper, 'to' => $makeSuper],
                'permissions' => ['from' => $before, 'to' => array_values(array_unique(array_map('strval', $permissions)))],
            ]);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        $this->permissions->forget($id);
        $this->success([
            'user_id' => $id,
            'is_super_admin' => $makeSuper,
            'permissions' => $this->permissions->grantedRows($id),
        ], 'Permissions updated');
    }
}
