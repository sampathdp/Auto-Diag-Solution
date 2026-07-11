<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Repositories\UserRepository;

class UserController extends BaseController
{
    // Roles a caller of these (admin-only) endpoints is allowed to assign.
    // Kept as an explicit allow-list rather than trusting the request body directly.
    private const ASSIGNABLE_ROLES = ['admin', 'customer'];

    private UserRepository $userRepo;

    public function __construct()
    {
        $this->userRepo = new UserRepository();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        // Cap per_page so a caller can't force an unbounded full-table scan.
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));

        $users = $this->userRepo->all([], $page, $perPage);
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

        if (!$this->userRepo->find($id)) {
            $this->error('User not found', null, 404);
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
        $this->success(null, 'User updated successfully');
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');

        if ($id === (int)$request->user->id) {
            $this->error('You cannot delete your own account', null, 400);
            return;
        }

        if (!$this->userRepo->find($id)) {
            $this->error('User not found', null, 404);
            return;
        }

        $this->userRepo->delete($id);
        $this->success(null, 'User deleted successfully');
    }
}
