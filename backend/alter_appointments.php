<?php

require_once __DIR__ . '/bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

try {
    $db = DatabaseManager::connect();
    
    // Check if columns exist
    $checkSql = "SHOW COLUMNS FROM appointments LIKE 'actual_start_time'";
    $stmt = $db->query($checkSql);
    if ($stmt->rowCount() === 0) {
        $db->exec("ALTER TABLE appointments ADD COLUMN actual_start_time DATETIME NULL");
        echo "Added actual_start_time column.\n";
    }

    $checkSql = "SHOW COLUMNS FROM appointments LIKE 'actual_end_time'";
    $stmt = $db->query($checkSql);
    if ($stmt->rowCount() === 0) {
        $db->exec("ALTER TABLE appointments ADD COLUMN actual_end_time DATETIME NULL");
        echo "Added actual_end_time column.\n";
    }

    echo "Migration completed successfully.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
