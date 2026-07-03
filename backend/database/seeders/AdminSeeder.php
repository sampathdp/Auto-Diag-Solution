<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding Super Admin...\n";

try {
    // Check if admin already exists
    $stmt = DatabaseManager::query("SELECT id FROM users WHERE email = 'admin@salonflow.com'");
    if ($stmt->fetch()) {
        echo "Admin already exists.\n";
        exit;
    }

    $password = password_hash('admin123', PASSWORD_BCRYPT);
    
    DatabaseManager::query(
        "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
        ['Super Admin', 'admin@salonflow.com', $password, 'super_admin', 1]
    );

    echo "Super Admin created successfully!\n";
    echo "Email: admin@salonflow.com\n";
    echo "Password: admin123\n";

} catch (Exception $e) {
    echo "Error Seeding: " . $e->getMessage() . "\n";
}
