<?php

require __DIR__ . '/app/Core/Database/DatabaseManager.php';

use App\Core\Database\DatabaseManager;

$db = DatabaseManager::connect();

try {
    $db->beginTransaction();

    echo "1. Adding plan_id to salon_payments...\n";
    $db->exec("ALTER TABLE salon_payments ADD COLUMN plan_id INT NULL AFTER amount");

    echo "2. Backfilling plan_id in subscriptions...\n";
    $db->exec("UPDATE subscriptions s 
               JOIN subscription_plans sp ON LOWER(s.plan_name) = LOWER(sp.name)
               SET s.plan_id = sp.id 
               WHERE s.plan_name IS NOT NULL");

    echo "3. Backfilling plan_id in salon_payments...\n";
    $db->exec("UPDATE salon_payments spay 
               JOIN subscription_plans sp ON LOWER(spay.plan_name) = LOWER(sp.name)
               SET spay.plan_id = sp.id 
               WHERE spay.plan_name IS NOT NULL");

    echo "4. Backfilling plan_id in trial_requests...\n";
    $db->exec("UPDATE trial_requests tr 
               JOIN subscription_plans sp ON LOWER(tr.selected_plan) = LOWER(sp.name)
               SET tr.plan_id = sp.id 
               WHERE tr.selected_plan IS NOT NULL");

    echo "5. Dropping plan_name from subscriptions...\n";
    $db->exec("ALTER TABLE subscriptions DROP COLUMN plan_name");

    echo "6. Dropping plan_name from salon_payments...\n";
    $db->exec("ALTER TABLE salon_payments DROP COLUMN plan_name");

    echo "7. Dropping selected_plan from trial_requests...\n";
    $db->exec("ALTER TABLE trial_requests DROP COLUMN selected_plan");

    $db->commit();
    echo "Migration completed successfully!\n";

} catch (Exception $e) {
    $db->rollBack();
    echo "Migration failed: " . $e->getMessage() . "\n";
}
