<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Core\Auth\TenantContext;

class BranchController extends BaseController
{
    public function index(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) {
            $this->error("Salon context missing.");
            return;
        }

        $sql = "SELECT * FROM branches WHERE salon_id = :salon_id ORDER BY id ASC";
        $stmt = DatabaseManager::query($sql, ['salon_id' => $salonId]);
        $branches = $stmt->fetchAll();

        foreach ($branches as &$b) {
            $b['is_active'] = (int)$b['is_active'];
        }
        unset($b);

        $this->success($branches);
    }

    public function store(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) {
            $this->error("Salon context missing.");
            return;
        }

        // 1. Enforce Subscription Limits
        $subSql = "SELECT sp.name as plan_name, sp.features, sub.status as sub_status, sub.expires_at 
                   FROM subscriptions sub 
                   JOIN subscription_plans sp ON sub.plan_id = sp.id 
                   WHERE sub.salon_id = :salon_id AND sub.status IN ('trial', 'active') 
                   LIMIT 1";
        $sub = DatabaseManager::query($subSql, ['salon_id' => $salonId])->fetch();
        
        $planName = $sub ? strtolower($sub['plan_name']) : 'starter';
        $features = $sub ? json_decode($sub['features'], true) : [];
        $hasMultiBranch = isset($features['Multi-Branch']) && $features['Multi-Branch'] === 'YES';
        $isTrialActive = $sub && $sub['sub_status'] === 'trial' && (!$sub['expires_at'] || strtotime($sub['expires_at']) >= time());

        // Calculate limits
        $limit = 0; // Default Starter: 0 additional branches (only the main salon)
        if ($isTrialActive) {
            $limit = 9999; // Unlimited branches during trial
        } elseif ($hasMultiBranch) {
            $limit = ($planName === 'professional') ? 3 : 9999; // 3 for Professional, unlimited (9999) for Enterprise
        }

        // Check active count
        $countSql = "SELECT COUNT(*) as active_count FROM branches WHERE salon_id = :salon_id AND is_active = 1";
        $activeCount = (int)DatabaseManager::query($countSql, ['salon_id' => $salonId])->fetch()['active_count'];

        if ($activeCount >= $limit) {
            $this->error("Your active subscription plan limits you to a maximum of {$limit} branch location(s). Upgrade your subscription plan in Settings to add more branches!");
            return;
        }

        // 2. Validate Inputs
        $data = $request->all();
        if (empty($data['name'])) {
            $this->error("Branch name is required.");
            return;
        }

        // 3. Insert Branch
        $sql = "INSERT INTO branches (salon_id, name, phone, address, opening_time, closing_time, is_active) 
                VALUES (:salon_id, :name, :phone, :address, :opening_time, :closing_time, 1)";
        
        try {
            DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'name' => $data['name'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'opening_time' => $data['opening_time'] ?? '09:00:00',
                'closing_time' => $data['closing_time'] ?? '18:00:00'
            ]);
            $this->success(null, "Branch created successfully!");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) {
            $this->error("Salon context missing.");
            return;
        }

        $id = (int)$request->getParam('id');
        $data = $request->all();

        if (empty($data['name'])) {
            $this->error("Branch name is required.");
            return;
        }

        $sql = "UPDATE branches SET 
                name = :name, 
                phone = :phone, 
                address = :address, 
                opening_time = :opening_time, 
                closing_time = :closing_time,
                is_active = :is_active 
                WHERE id = :id AND salon_id = :salon_id";
        
        try {
            DatabaseManager::query($sql, [
                'id' => $id,
                'salon_id' => $salonId,
                'name' => $data['name'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'opening_time' => $data['opening_time'] ?? '09:00:00',
                'closing_time' => $data['closing_time'] ?? '18:00:00',
                'is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1
            ]);
            $this->success(null, "Branch updated successfully!");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) {
            $this->error("Salon context missing.");
            return;
        }

        $id = (int)$request->getParam('id');

        $sql = "UPDATE branches SET is_active = 0 WHERE id = :id AND salon_id = :salon_id";
        try {
            DatabaseManager::query($sql, ['id' => $id, 'salon_id' => $salonId]);
            $this->success(null, "Branch deactivated successfully.");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
