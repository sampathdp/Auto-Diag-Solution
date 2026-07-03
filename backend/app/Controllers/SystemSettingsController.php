<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;

class SystemSettingsController extends BaseController
{
    // Admin: get all system settings as key-value map
    public function index(Request $request): void
    {
        $rows = DatabaseManager::query("SELECT setting_key, setting_value FROM system_settings")->fetchAll();
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        $this->success($settings);
    }

    // Admin: update one or more system settings
    public function update(Request $request): void
    {
        $data = $request->all();
        if (empty($data)) {
            $this->error('No settings provided.', null, 400);
        }

        foreach ($data as $key => $value) {
            DatabaseManager::query(
                "INSERT INTO system_settings (setting_key, setting_value)
                 VALUES (:key, :value)
                 ON DUPLICATE KEY UPDATE setting_value = :value2, updated_at = NOW()",
                ['key' => $key, 'value' => $value, 'value2' => $value]
            );
        }

        $this->success(null, 'System settings updated successfully.');
    }

    // Authenticated (non-admin) salon owner endpoint — returns only bank details for payment
    public function bankDetails(Request $request): void
    {
        $keys = ['bank_name', 'bank_account_name', 'bank_account_no', 'bank_branch', 'bank_instructions'];
        $placeholders = implode(',', array_map(fn($k) => "'$k'", $keys));
        $rows = DatabaseManager::query(
            "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ($placeholders)"
        )->fetchAll();

        $details = [];
        foreach ($rows as $row) {
            $details[$row['setting_key']] = $row['setting_value'];
        }
        $this->success($details);
    }
}
