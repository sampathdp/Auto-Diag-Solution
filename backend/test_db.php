<?php
$db = new PDO('mysql:host=127.0.0.1;dbname=salon_saas', 'root', '');
$stmt = $db->query('SELECT * FROM salons');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($rows as $row) {
    echo json_encode($row) . PHP_EOL;
}
