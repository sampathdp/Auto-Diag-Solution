<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\UserRepository;
use Exception;

class UserService extends BaseService
{
    private UserRepository $userRepo;

    public function __construct()
    {
        $this->userRepo = new UserRepository();
    }

    public function getAllUsers(array $filters, int $page, int $perPage): array
    {
        return $this->userRepo->all($filters, $page, $perPage);
    }

    public function createUser(array $data): int
    {
        if ($this->userRepo->findByEmail($data['email'])) {
            throw new Exception("Email already exists.");
        }

        $data['password'] = password_hash($data['password'] ?? 'salon123', PASSWORD_BCRYPT);
        $data['needs_password_change'] = 1;
        return $this->userRepo->create($data);
    }

    public function updateUser(int $id, array $data): bool
    {
        // Strip fields that must never be changed via a user-facing update
        unset($data['role'], $data['salon_id'], $data['is_active'], $data['needs_password_change']);

        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }
        return $this->userRepo->update($id, $data);
    }

    public function deleteUser(int $id): bool
    {
        return $this->userRepo->delete($id);
    }
}
