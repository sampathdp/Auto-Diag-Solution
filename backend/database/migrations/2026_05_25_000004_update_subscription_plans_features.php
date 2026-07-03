<?php

declare(strict_types=1);

use App\Core\Database\Migration;
use App\Core\Database\DatabaseManager;

class UpdateSubscriptionPlansFeatures extends Migration
{
    public function up(): void
    {
        $plans = DatabaseManager::query("SELECT id, name, features FROM subscription_plans")->fetchAll();
        foreach ($plans as $p) {
            $features = json_decode($p['features'], true) ?: [];
            
            if (strtolower($p['name']) === 'starter') {
                $features['SMS Gateway Integration'] = 'NO';
                $features['Email Notifications (with Calendar Invites)'] = 'YES';
            } else {
                $features['SMS Gateway Integration'] = 'YES';
                $features['Email Notifications (with Calendar Invites)'] = 'YES';
            }
            
            DatabaseManager::query(
                "UPDATE subscription_plans SET features = :features WHERE id = :id",
                ['features' => json_encode($features), 'id' => $p['id']]
            );
        }
    }

    public function down(): void
    {
        $plans = DatabaseManager::query("SELECT id, features FROM subscription_plans")->fetchAll();
        foreach ($plans as $p) {
            $features = json_decode($p['features'], true) ?: [];
            unset($features['SMS Gateway Integration']);
            unset($features['Email Notifications (with Calendar Invites)']);
            
            DatabaseManager::query(
                "UPDATE subscription_plans SET features = :features WHERE id = :id",
                ['features' => json_encode($features), 'id' => $p['id']]
            );
        }
    }
}
