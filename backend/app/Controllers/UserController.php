<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\UserService;

class UserController extends BaseController
{
    private UserService $userService;

    public function __construct()
    {
        $this->userService = new UserService();
    }

    public function index(Request $request): void
    {
        $filters = $request->all();
        $page = (int)($request->input('page') ?? 1);
        $perPage = (int)($request->input('per_page') ?? 15);

        $result = $this->userService->getAllUsers($filters, $page, $perPage);
        $this->success($result);
    }

    public function store(Request $request): void
    {
        try {
            $id = $this->userService->createUser($request->all());
            $this->success(['id' => $id], 'User created successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->userService->updateUser($id, $request->all());
            $this->success(null, 'User updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->userService->deleteUser($id);
        $this->success(null, 'User deleted successfully');
    }
}
