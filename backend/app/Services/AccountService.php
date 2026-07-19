<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\OrderRepository;
use App\Repositories\UserRepository;

class AccountService
{
    private UserRepository $users;
    private OrderRepository $orders;
    private NotificationPreferenceRepository $notificationPrefs;

    public function __construct()
    {
        $this->users = new UserRepository();
        $this->orders = new OrderRepository();
        $this->notificationPrefs = new NotificationPreferenceRepository();
    }

    public function getProfile(int $userId): array
    {
        $user = $this->users->find($userId);
        if (!$user) {
            throw new DomainException('User not found', 404);
        }

        return $this->shape($user);
    }

    public function updateProfile(int $userId, array $input): array
    {
        $user = $this->users->find($userId);
        if (!$user) {
            throw new DomainException('User not found', 404);
        }

        $name = trim((string)($input['name'] ?? $user['name']));
        $email = strtolower(trim((string)($input['email'] ?? $user['email'])));

        if ($name === '') {
            throw new DomainException('Name is required', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new DomainException('A valid email address is required', 422);
        }
        if ($this->users->existsExcluding('email', $email, $userId)) {
            throw new DomainException('This email is already in use by another account', 409);
        }

        $fields = [
            'name' => $name,
            'email' => $email,
            'phone' => array_key_exists('phone', $input) ? (string)$input['phone'] : $user['phone'],
            'dob' => !empty($input['dob']) ? (string)$input['dob'] : null,
            'language' => in_array($input['language'] ?? null, ['en', 'ar'], true) ? $input['language'] : $user['language'],
        ];
        $this->users->update($userId, $fields);

        if (isset($input['preferences']) && is_array($input['preferences'])) {
            $prefs = $input['preferences'];
            $update = [];
            if (array_key_exists('marketing_emails', $prefs)) {
                $update['email_promotions'] = !empty($prefs['marketing_emails']) ? 1 : 0;
            }
            if (array_key_exists('whatsapp_updates', $prefs)) {
                $update['whatsapp_updates'] = !empty($prefs['whatsapp_updates']) ? 1 : 0;
            }
            if ($update) {
                $this->notificationPrefs->upsertForUser($userId, $update);
            }
        }

        return $this->getProfile($userId);
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): void
    {
        $user = $this->users->find($userId);
        if (!$user) {
            throw new DomainException('User not found', 404);
        }
        if (!password_verify($currentPassword, $user['password'])) {
            throw new DomainException('Incorrect current password', 400);
        }
        if (strlen($newPassword) < 8) {
            throw new DomainException('New password must be at least 8 characters long', 422);
        }

        $this->users->update($userId, [
            'password' => password_hash($newPassword, PASSWORD_BCRYPT),
        ]);
    }

    public function deleteAccount(int $userId): void
    {
        if ($this->orders->countByUser($userId) > 0) {
            throw new DomainException('Accounts with existing orders cannot be deleted. Please contact support.', 409);
        }
        $this->users->delete($userId);
    }

    private function shape(array $user): array
    {
        $prefs = $this->notificationPrefs->getOrCreateForUser((int)$user['id']);
        $totalOrders = $this->orders->countByUser((int)$user['id']);
        $totalSpent = $this->orders->sumTotalByUser((int)$user['id']);

        return [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'dob' => $user['dob'],
            'language' => $user['language'],
            'avatar_url' => $user['avatar_url'],
            'email_verified' => true,
            'role' => $user['role'],
            'preferences' => [
                'marketing_emails' => (bool)$prefs['email_promotions'],
                'whatsapp_updates' => (bool)$prefs['whatsapp_updates'],
            ],
            'stats' => [
                'member_since' => $user['created_at'],
                'total_orders' => $totalOrders,
                'total_spent' => $totalSpent,
                'tier' => $this->tierFor($totalSpent),
            ],
        ];
    }

    private function tierFor(float $totalSpent): string
    {
        if ($totalSpent >= 5000) {
            return 'Gold Member';
        }
        if ($totalSpent >= 1000) {
            return 'Silver Member';
        }
        return 'Member';
    }
}
