<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\SettingsService;

class SettingsController extends BaseController
{
    private SettingsService $settingsService;

    public function __construct()
    {
        $this->settingsService = new SettingsService();
    }

    public function index(Request $request): void
    {
        $settings = $this->settingsService->getSettings();
        $this->success($settings);
    }

    public function store(Request $request): void
    {
        try {
            $this->settingsService->saveSettings($request->all());
            $this->success(null, 'Settings updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function upgradeSubscription(Request $request): void
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        if (!$salonId) {
            $this->error("Salon context missing.");
            return;
        }

        $planId = (int)$request->input('plan_id');
        if (!$planId) {
            $this->error("Plan ID is required.");
            return;
        }

        try {
            // Check if subscription exists
            $checkSql = "SELECT id FROM subscriptions WHERE salon_id = :salon_id LIMIT 1";
            $sub = \App\Core\Database\DatabaseManager::query($checkSql, ['salon_id' => $salonId])->fetch();

            if ($sub) {
                // Update
                $sql = "UPDATE subscriptions SET 
                        plan_id = :plan_id, 
                        status = 'active', 
                        starts_at = NOW(), 
                        expires_at = DATE_ADD(NOW(), INTERVAL 1 MONTH) 
                        WHERE salon_id = :salon_id";
                \App\Core\Database\DatabaseManager::query($sql, [
                    'salon_id' => $salonId,
                    'plan_id' => $planId
                ]);
            } else {
                // Insert
                $sql = "INSERT INTO subscriptions (salon_id, plan_id, status, starts_at, expires_at) 
                        VALUES (:salon_id, :plan_id, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))";
                \App\Core\Database\DatabaseManager::query($sql, [
                    'salon_id' => $salonId,
                    'plan_id' => $planId
                ]);
            }

            // Also update the salon status
            $sqlSalon = "UPDATE salons SET subscription_status = 'active' WHERE id = :id";
            \App\Core\Database\DatabaseManager::query($sqlSalon, ['id' => $salonId]);

            $this->success(null, 'Subscription upgraded successfully!');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function testSms(Request $request): void
    {
        $apiKey = $request->input('api_key');
        $senderId = $request->input('sender_id');
        $recipient = $request->input('recipient');
        $message = $request->input('message') ?? 'Hello! This is a test message from your Salon System.';

        if (empty($apiKey) || empty($senderId) || empty($recipient)) {
            $this->error("API Key, Sender ID, and Recipient Phone Number are required.");
            return;
        }

        try {
            $smsService = new \App\Services\SmsService();
            $result = $smsService->sendTestSms($apiKey, $senderId, $recipient, $message);
            if ($result['success']) {
                $this->success($result['data'], $result['message']);
            } else {
                $this->error($result['message'], 400, $result['data'] ?? null);
            }
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
