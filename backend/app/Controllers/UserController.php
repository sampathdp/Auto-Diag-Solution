<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Repositories\UserRepository;

class UserController extends BaseController
{
    private UserRepository $userRepo;

    public function __construct()
    {
        $this->userRepo = new UserRepository();
    }

    public function index(Request $request): void
    {
        $page = (int)($request->input('page') ?? 1);
        $perPage = (int)($request->input('per_page') ?? 15);

        $users = $this->userRepo->all([], $page, $perPage);
        foreach ($users as &$user) {
            unset($user['password']);
        }

        $this->success($users);
    }

    public function store(Request $request): void
    {
        $data = $request->all();

        if (empty($data['email']) || empty($data['password'])) {
            $this->error('Email and password are required');
            return;
        }

        if ($this->userRepo->findByEmail(strtolower(trim($data['email'])))) {
            $this->error('A user with this email already exists');
            return;
        }

        $id = $this->userRepo->create([
            'name' => $data['name'] ?? '',
            'email' => strtolower(trim($data['email'])),
            'password' => password_hash($data['password'], PASSWORD_BCRYPT),
            'role' => $data['role'] ?? 'customer',
        ]);

        $this->success(['id' => $id], 'User created successfully', 201);
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $data = $request->all();
        unset($data['id'], $data['email']);

        if (!empty($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        } else {
            unset($data['password']);
        }

        $this->userRepo->update($id, $data);
        $this->success(null, 'User updated successfully');
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->userRepo->delete($id);
        $this->success(null, 'User deleted successfully');
    }
}
