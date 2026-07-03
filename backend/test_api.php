<?php
// Mocking the request to see what DashboardController does

$db = new PDO('mysql:host=127.0.0.1;dbname=salon_saas', 'root', '');
$stmt = $db->query("SELECT plan_name, status, starts_at, expires_at FROM subscriptions WHERE salon_id = 22 LIMIT 1");
$sub = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Sub for salon 22:\n";
print_r($sub);

// Let's check user 22's data
$stmt2 = $db->query("SELECT * FROM users WHERE salon_id = 22");
$users = $stmt2->fetchAll(PDO::FETCH_ASSOC);
echo "\nUsers for salon 22:\n";
print_r($users);
