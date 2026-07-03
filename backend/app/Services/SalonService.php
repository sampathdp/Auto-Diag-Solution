<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\SalonRepository;
use App\Repositories\UserRepository;
use Exception;

class SalonService extends BaseService
{
    private SalonRepository $salonRepo;
    private UserRepository $userRepo;
    private PasswordGeneratorService $passwordService;

    public function __construct()
    {
        $this->salonRepo = new SalonRepository();
        $this->userRepo = new UserRepository();
        $this->passwordService = new PasswordGeneratorService();
    }

    public function getAllSalons(array $filters, int $page, int $perPage): array
    {
        return $this->salonRepo->all($filters, $page, $perPage);
    }

    public function getSalonById(int $id): ?array
    {
        return $this->salonRepo->find($id);
    }

    public function createSalon(array $data): array
    {
        // Business Rule: Slugs must be unique
        if (isset($data['slug'])) {
            $existing = $this->salonRepo->findBySlug($data['slug']);
            if ($existing) {
                throw new Exception("The slug '{$data['slug']}' is already in use.");
            }
        }

        try {
            \App\Core\Database\DatabaseManager::beginTransaction();

            // 1. Create Salon
            $salonId = $this->salonRepo->create([
                'name' => $data['name'],
                'slug' => $data['slug'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'timezone' => $data['timezone'] ?? 'Asia/Colombo',
                'currency' => $data['currency'] ?? 'LKR',
                'is_active' => $data['is_active'] ?? true,
            ]);

            // 1b. Create Default Appearance Settings for Salon
            $sqlAppearance = "INSERT INTO salon_appearances (salon_id, theme, primary_color, font_family, button_style, logo, cover_image, layout_style)
                              VALUES (:salon_id, 'modern', '#6366f1', 'Inter', 'modern', NULL, NULL, 'full')";
            \App\Core\Database\DatabaseManager::query($sqlAppearance, ['salon_id' => $salonId]);

            // 1c. Create default business hours for salon
            for ($day = 0; $day < 7; $day++) {
                $sqlHours = "INSERT INTO salon_business_hours (salon_id, day_of_week, is_open, open_time, close_time) 
                             VALUES (:salon_id, :day, 1, '08:00:00', '18:00:00')";
                \App\Core\Database\DatabaseManager::query($sqlHours, [
                    'salon_id' => $salonId,
                    'day' => $day
                ]);
            }

            // 2. Generate Password for Owner
            $rawPassword = $this->passwordService->generate();
            $hashedPassword = password_hash($rawPassword, PASSWORD_BCRYPT);

            // 3. Create Owner User
            $this->userRepo->create([
                'salon_id' => $salonId,
                'name' => $data['owner_name'] ?? $data['name'] . ' Owner',
                'email' => $data['email'],
                'password' => $hashedPassword,
                'role' => 'salon_owner',
                'is_active' => true
            ]);

            // 4. Create Initial Subscription (Trial)
            $sql = "INSERT INTO subscriptions (salon_id, plan_id, status, starts_at, expires_at) 
                    VALUES (:salon_id, :plan_id, 'trial', NULL, NULL)";
            \App\Core\Database\DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'plan_id' => 1
            ]);

            \App\Core\Database\DatabaseManager::commit();

            return [
                'id' => $salonId,
                'email' => $data['email'],
                'password' => $rawPassword,
                'salon_name' => $data['name']
            ];

        } catch (\Exception $e) {
            \App\Core\Database\DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function updateSalon(int $id, array $data): bool
    {
        $salon = $this->salonRepo->find($id);
        if (!$salon) {
            throw new Exception("Salon not found.");
        }

        // Strip fields that must never be changed via a salon_owner-facing update
        unset($data['subscription_status'], $data['grace_period_days'], $data['is_active'], $data['slug']);

        return $this->salonRepo->update($id, $data);
    }

    public function deleteSalon(int $id): bool
    {
        return $this->salonRepo->delete($id);
    }

    public function resetOwnerPassword(int $salonId): string
    {
        // 1. Find the salon owner
        $users = $this->userRepo->all(['salon_id' => $salonId, 'role' => 'salon_owner']);
        if (empty($users)) {
            throw new Exception("No owner account found for this salon.");
        }

        $owner = $users[0];
        
        // 2. Generate new password
        $newPassword = $this->passwordService->generate();
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

        // 3. Update user
        $this->userRepo->update((int)$owner['id'], ['password' => $hashedPassword]);

        return $newPassword;
    }

    public function getSalonUsers(int $salonId): array
    {
        return $this->userRepo->all(['salon_id' => $salonId]);
    }

    public function activateTrial(int $salonId): bool
    {
        try {
            \App\Core\Database\DatabaseManager::beginTransaction();

            // 1. Start Subscription Clock (14 days)
            $sql = "UPDATE subscriptions SET
                    starts_at = NOW(),
                    expires_at = DATE_ADD(NOW(), INTERVAL 14 DAY)
                    WHERE salon_id = :salon_id AND status = 'trial' AND starts_at IS NULL";
            \App\Core\Database\DatabaseManager::query($sql, ['salon_id' => $salonId]);

            // 2. Also update trial_requests if linked (optional but good for consistency)
            $salon = $this->salonRepo->find($salonId);
            if ($salon) {
                $sql = "UPDATE trial_requests SET activation_started_at = NOW() WHERE email = :email";
                \App\Core\Database\DatabaseManager::query($sql, ['email' => $salon['email']]);
            }

            \App\Core\Database\DatabaseManager::commit();
            return true;
        } catch (\Exception $e) {
            \App\Core\Database\DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function setStartDate(int $salonId, string $startDate): bool
    {
        $sub = \App\Core\Database\DatabaseManager::query(
            "SELECT status FROM subscriptions WHERE salon_id = :sid AND status IN ('trial','active') LIMIT 1",
            ['sid' => $salonId]
        )->fetch();

        if (!$sub) {
            throw new \Exception('No active or trial subscription found for this salon.');
        }

        \App\Core\Database\DatabaseManager::query(
            "UPDATE subscriptions
             SET starts_at        = :starts_at,
                 expires_at       = DATE_ADD(:starts_at2, INTERVAL 1 MONTH),
                 status           = 'active',
                 reminder_7d_sent = 0,
                 reminder_3d_sent = 0,
                 reminder_1d_sent = 0,
                 expiry_notified  = 0
             WHERE salon_id = :salon_id AND status IN ('trial','active')",
            ['starts_at' => $startDate, 'starts_at2' => $startDate, 'salon_id' => $salonId]
        );

        return true;
    }
}
