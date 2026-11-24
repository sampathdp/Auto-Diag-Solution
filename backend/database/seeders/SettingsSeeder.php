<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding default settings...\n";

$defaults = [
    ['key' => 'vat_rate', 'value' => '5.00', 'type' => 'number', 'group_name' => 'tax'],
    ['key' => 'currency', 'value' => 'AED', 'type' => 'string', 'group_name' => 'general'],
    ['key' => 'site_name', 'value' => 'Auto Parts UAE', 'type' => 'string', 'group_name' => 'general'],
    ['key' => 'support_email', 'value' => 'support@example.com', 'type' => 'string', 'group_name' => 'general'],
    ['key' => 'whatsapp_number', 'value' => '', 'type' => 'string', 'group_name' => 'general'],
    ['key' => 'ga_tracking_id', 'value' => '', 'type' => 'string', 'group_name' => 'integrations'],
    ['key' => 'stripe_publishable_key', 'value' => '', 'type' => 'string', 'group_name' => 'payments'],

    // Payment and B2B settings (payment_*, retail_payment_methods, b2b_*) are created
    // automatically by SettingService::ensureRestrictedRows() on first use.
];

try {
    foreach ($defaults as $row) {
        $exists = DatabaseManager::query(
            "SELECT id FROM settings WHERE `key` = :key LIMIT 1",
            ['key' => $row['key']]
        )->fetch();

        if ($exists) {
            echo "Skipped (already exists): {$row['key']}\n";
            continue;
        }

        DatabaseManager::query(
            "INSERT INTO settings (`key`, value, type, group_name) VALUES (:key, :value, :type, :group_name)",
            $row
        );
        echo "Seeded: {$row['key']}\n";
    }

    echo "Settings seeding complete.\n";
} catch (Exception $e) {
    echo "Error seeding settings: " . $e->getMessage() . "\n";
}
