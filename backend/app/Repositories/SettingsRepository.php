<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class SettingsRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('settings');
    }

    /**
     * Get all settings for the current salon as a key-value pair
     */
    public function getAllKeyValue(): array
    {
        $sql = "SELECT setting_key, setting_value FROM settings WHERE salon_id = :salon_id";
        $stmt = DatabaseManager::query($sql, ['salon_id' => \App\Core\Auth\TenantContext::getTenantId()]);
        
        $settings = [];
        foreach ($stmt->fetchAll() as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        return $settings;
    }

    /**
     * Get all settings for a specific salon as a key-value pair
     */
    public function getAllKeyValueForSalon(int $salonId): array
    {
        $sql = "SELECT setting_key, setting_value FROM settings WHERE salon_id = :salon_id";
        $stmt = DatabaseManager::query($sql, ['salon_id' => $salonId]);
        
        $settings = [];
        foreach ($stmt->fetchAll() as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        return $settings;
    }

    /**
     * Bulk update or insert settings
     */
    public function updateBulk(array $settings, int $salonId): void
    {
        foreach ($settings as $key => $value) {
            $sql = "INSERT INTO settings (salon_id, setting_key, setting_value) 
                    VALUES (:salon_id, :key, :value)
                    ON DUPLICATE KEY UPDATE setting_value = :value_update";
            
            DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'key' => $key,
                'value' => $value,
                'value_update' => $value
            ]);
        }
    }
}
