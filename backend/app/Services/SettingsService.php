<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\SettingsRepository;
use App\Core\Auth\TenantContext;

class SettingsService extends BaseService
{
    private SettingsRepository $settingsRepo;

    public function __construct()
    {
        $this->settingsRepo = new SettingsRepository();
    }

    public function getSettings(): array
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) return [];

        // 1. Get KV settings from settings table
        $kvSettings = $this->settingsRepo->getAllKeyValue();

        $sql = "SELECT s.name as salon_name, s.timezone, s.currency, s.phone, s.email, s.slug, s.address,
                       sa.theme, sa.primary_color, sa.font_family, sa.button_style, sa.logo, sa.cover_image, sa.layout_style,
                       sa.social_instagram, sa.social_facebook,
                       sp.name as plan_name, sub.status as sub_status, sub.expires_at,
                       sub.discount_percent, sub.discount_expires_at,
                       sp.allowed_themes
                FROM salons s
                LEFT JOIN salon_appearances sa ON s.id = sa.salon_id
                LEFT JOIN subscriptions sub ON s.id = sub.salon_id AND sub.status IN ('active', 'trial')
                LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
                WHERE s.id = :id
                LIMIT 1";

        $salon = \App\Core\Database\DatabaseManager::query($sql, ['id' => $salonId])->fetch();

        if ($salon) {
            // Always enforce the plan's allowed_themes — trial does not override theme access
            $salon['allowed_themes'] = isset($salon['allowed_themes']) ? json_decode($salon['allowed_themes'], true) : ['modern'];
        }

        return array_merge($salon ?: [], $kvSettings);

    }

    public function saveSettings(array $settings): void
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) throw new \Exception("Salon context missing.");
        
        // Enforce plan limits: Block SMS on Starter plan (unless on active Trial)
        if (isset($settings['sms_enabled']) && $settings['sms_enabled'] === '1') {
            $subSql = "SELECT sp.name as plan_name, sub.status, sub.expires_at 
                       FROM subscriptions sub 
                       LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id 
                       WHERE sub.salon_id = :salon_id AND sub.status IN ('active', 'trial') LIMIT 1";
            $sub = \App\Core\Database\DatabaseManager::query($subSql, ['salon_id' => $salonId])->fetch();
            $planName = $sub && $sub['plan_name'] ? strtolower($sub['plan_name']) : 'starter';
            $isTrialActive = $sub && $sub['status'] === 'trial' && (!$sub['expires_at'] || strtotime($sub['expires_at']) >= time());
            
            if ($planName === 'starter' && !$isTrialActive) {
                throw new \Exception("SMS Notifications are not available on the Starter plan. Please upgrade your subscription.");
            }
        }

        $coreKeys = [
            'salon_name' => 'name', 
            'timezone' => 'timezone', 
            'currency' => 'currency', 
            'phone' => 'phone',
            'email' => 'email',
            'slug' => 'slug',
            'address' => 'address',
            'theme' => 'theme',
            'primary_color' => 'primary_color',
            'font_family' => 'font_family',
            'button_style' => 'button_style',
            'logo' => 'logo',
            'cover_image' => 'cover_image',
            'layout_style' => 'layout_style',
            'social_instagram' => 'social_instagram',
            'social_facebook' => 'social_facebook',
        ];

        $coreData = [];
        $kvData = [];

        foreach ($settings as $key => $value) {
            if (array_key_exists($key, $coreKeys)) {
                $coreData[$coreKeys[$key]] = $value;
            } else {
                $kvData[$key] = $value;
            }
        }

        if (!empty($coreData)) {
            $repo = new \App\Repositories\SalonRepository();
            $repo->update($salonId, $coreData);
        }

        if (!empty($kvData)) {
            $this->settingsRepo->updateBulk($kvData, $salonId);
        }
    }
}
