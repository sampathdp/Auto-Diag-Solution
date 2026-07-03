<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding Super Admin...\n";

try {
    // Check if admin already exists
    $stmt = DatabaseManager::query("SELECT id FROM users WHERE email = 'admin@example.com'");
    if ($stmt->fetch()) {
        echo "Admin already exists.\n";
        exit;
    }

    $password = password_hash('admin123', PASSWORD_BCRYPT);

    DatabaseManager::query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        ['Admin', 'admin@example.com', $password, 'admin']
    );

    echo "Admin created successfully!\n";
    echo "Email: admin@example.com\n";
    echo "Password: admin123\n";

} catch (Exception $e) {
    echo "Error Seeding: " . $e->getMessage() . "\n";
}
