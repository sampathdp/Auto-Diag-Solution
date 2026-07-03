<?php

use App\Core\Database\DatabaseManager;

class AddMaxStaffToSubscriptionPlans
{
    public function up(): void
    {
        $this->execute("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_staff INT NOT NULL DEFAULT 9999");

        // Set limits per plan name (case-insensitive match)
        $plans = DatabaseManager::query("SELECT id, name FROM subscription_plans")->fetchAll();
        foreach ($plans as $p) {
            $name = strtolower($p['name']);
            $limit = match(true) {
                str_contains($name, 'starter') => 1,
                str_contains($name, 'professional') => 5,
                default => 9999,
            };
            DatabaseManager::query(
                "UPDATE subscription_plans SET max_staff = :limit WHERE id = :id",
                ['limit' => $limit, 'id' => $p['id']]
            );
        }
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE subscription_plans DROP COLUMN IF EXISTS max_staff");
    }

    private function execute(string $sql): void
    {
        DatabaseManager::query($sql, []);
    }
}
