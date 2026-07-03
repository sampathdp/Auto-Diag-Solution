<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\SalonService;
use App\Services\PasswordGeneratorService;
use App\Core\Database\DatabaseManager;

class SalonController extends BaseController
{
    private SalonService $salonService;

    public function __construct()
    {
        $this->salonService = new SalonService();
    }

    public function index(Request $request): void
    {
        $filters = $request->all();
        $page = (int)($request->input('page') ?? 1);
        $perPage = (int)($request->input('per_page') ?? 15);

        $result = $this->salonService->getAllSalons($filters, $page, $perPage);
        $this->success($result);
    }

    public function show(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $salon = $this->salonService->getSalonById($id);
        
        if (!$salon) {
            $this->error('Salon not found', null, 404);
        }
        
        $this->success($salon);
    }

    public function store(Request $request): void
    {
        $data = $request->all();
        // Validation logic would go here (e.g. check slug uniqueness)
        
        try {
            $result = $this->salonService->createSalon($data);
            $this->success($result, 'Salon created successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $data = $request->all();
        
        try {
            $this->salonService->updateSalon($id, $data);
            $this->success(null, 'Salon updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->salonService->deleteSalon($id);
        $this->success(null, 'Salon deleted successfully');
    }

    public function resetPassword(Request $request): void
    {
        $id = (int)$request->getParam('id');
        
        try {
            $newPassword = $this->salonService->resetOwnerPassword($id);
            $this->success(['password' => $newPassword], 'Owner password has been reset');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function users(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $users = $this->salonService->getSalonUsers($id);
        $this->success($users);
    }

    public function activateTrial(Request $request): void
    {
        try {
            $id = (int)$request->getParam('id');
            $this->salonService->activateTrial($id);
            $this->success(null, 'Trial activated for this salon!');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function setStartDate(Request $request): void
    {
        try {
            $id = (int)$request->getParam('id');
            $startDate = trim($request->input('start_date') ?? '');

            if (!$startDate || !\DateTimeImmutable::createFromFormat('Y-m-d', $startDate)) {
                $this->error('A valid start_date (YYYY-MM-DD) is required.');
                return;
            }

            $this->salonService->setStartDate($id, $startDate);
            $this->success(null, 'Subscription dates updated successfully!');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function createTempAccess(Request $request): void
    {
        $salonId = (int)$request->getParam('id');

        $salon = DatabaseManager::query(
            "SELECT id, name FROM salons WHERE id = :id LIMIT 1",
            ['id' => $salonId]
        )->fetch();

        if (!$salon) { $this->error('Salon not found.'); return; }

        $email    = "temp.access.{$salonId}@salonflow.internal";
        $password = (new PasswordGeneratorService())->generate();
        $hashed   = password_hash($password, PASSWORD_BCRYPT);

        $existing = DatabaseManager::query(
            "SELECT id FROM users WHERE email = :email AND salon_id = :salon_id LIMIT 1",
            ['email' => $email, 'salon_id' => $salonId]
        )->fetch();

        if ($existing) {
            DatabaseManager::query(
                "UPDATE users SET password = :pw, needs_password_change = 0 WHERE id = :id",
                ['pw' => $hashed, 'id' => $existing['id']]
            );
        } else {
            DatabaseManager::query(
                "INSERT INTO users (salon_id, name, email, password, role, needs_password_change, is_active)
                 VALUES (:sid, 'Temp Access', :email, :pw, 'salon_owner', 0, 1)",
                ['sid' => $salonId, 'email' => $email, 'pw' => $hashed]
            );
        }

        $loginUrl = rtrim($_ENV['APP_URL'] ?? 'https://salonflow.cloud', '/') . '/login';

        $this->success([
            'email'     => $email,
            'password'  => $password,
            'login_url' => $loginUrl,
            'salon'     => $salon['name'],
        ], 'Temporary access account ready.');
    }

    public function revokeTempAccess(Request $request): void
    {
        $salonId = (int)$request->getParam('id');
        $email   = "temp.access.{$salonId}@salonflow.internal";

        DatabaseManager::query(
            "DELETE FROM users WHERE email = :email AND salon_id = :sid",
            ['email' => $email, 'sid' => $salonId]
        );

        $this->success(null, 'Temporary access revoked.');
    }

    public function changePlan(Request $request): void
    {
        $id     = (int)$request->getParam('id');
        $planId = (int)($request->input('plan_id') ?? 0);

        if (!$planId) {
            $this->error('A valid plan_id is required.');
            return;
        }

        // Verify plan exists
        $plan = DatabaseManager::query(
            "SELECT id, name FROM subscription_plans WHERE id = :id LIMIT 1",
            ['id' => $planId]
        )->fetch();

        if (!$plan) {
            $this->error('Subscription plan not found.');
            return;
        }

        $updated = DatabaseManager::query(
            "UPDATE subscriptions SET plan_id = :plan_id WHERE salon_id = :salon_id AND status IN ('trial', 'active')",
            ['plan_id' => $planId, 'salon_id' => $id]
        )->rowCount();

        if (!$updated) {
            $this->error('No active subscription found for this salon. Activate a trial first.');
            return;
        }

        $this->success(null, "Plan changed to \"{$plan['name']}\" successfully.");
    }
}
