<?php

declare(strict_types=1);

// Load Manual Autoloader (No Composer)
require_once __DIR__ . '/bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

$command = $argv[1] ?? null;

switch ($command) {
    case 'migrate':
        runMigrations();
        break;
    case 'migrate:rollback':
        rollbackMigrations();
        break;
    case 'send-reminders':
        sendReminders();
        break;
    default:
        echo "Usage: php console.php [migrate|migrate:rollback|send-reminders]\n";
}

function runMigrations() {
    $files = glob(__DIR__ . '/database/migrations/*.php');
    foreach ($files as $file) {
        require_once $file;
        $className = getClassNameFromFile($file);
        $migration = new $className();
        echo "Migrating: $className...\n";
        $migration->up();
        echo "Migrated: $className\n";
    }
}

function rollbackMigrations() {
    $files = array_reverse(glob(__DIR__ . '/database/migrations/*.php'));
    foreach ($files as $file) {
        require_once $file;
        $className = getClassNameFromFile($file);
        $migration = new $className();
        echo "Rolling back: $className...\n";
        $migration->down();
        echo "Rolled back: $className\n";
    }
}

function getClassNameFromFile($file) {
    $name = basename($file, '.php');
    $parts = explode('_', $name);
    $cleanParts = array_slice($parts, 4);
    return implode('', array_map('ucfirst', $cleanParts));
}

function sendReminders() {
    $sql = "SELECT a.id, a.salon_id, a.appointment_date, a.start_time, 
                   c.name as customer_name, c.email as customer_email, 
                   s.name as salon_name, s.timezone as salon_timezone
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            JOIN salons s ON a.salon_id = s.id
            WHERE a.status IN ('pending', 'confirmed') 
              AND a.reminder_sent = 0";
              
    $stmt = DatabaseManager::query($sql);
    $appointments = $stmt->fetchAll();

    $emailService = new \App\Services\EmailService();
    $settingsRepo = new \App\Repositories\SettingsRepository();
    
    $salonSettings = [];

    foreach ($appointments as $app) {
        $salonId = (int)$app['salon_id'];
        $timezone = $app['salon_timezone'] ?: 'Asia/Colombo';
        
        try {
            $tz = new \DateTimeZone($timezone);
            $appDateTime = new \DateTime($app['appointment_date'] . ' ' . $app['start_time'], $tz);
            $now = new \DateTime('now', $tz);
        } catch (\Exception $e) {
            echo "Error parsing date/timezone for appointment ID {$app['id']}: " . $e->getMessage() . "\n";
            continue;
        }

        $diffSeconds = $appDateTime->getTimestamp() - $now->getTimestamp();

        // Check if appointment starts within the next 1 hour and 5 minutes (3900 seconds)
        if ($diffSeconds >= 0 && $diffSeconds <= 3900) {
            if (!isset($salonSettings[$salonId])) {
                $salonSettings[$salonId] = $settingsRepo->getAllKeyValueForSalon($salonId);
            }
            
            $settings = $salonSettings[$salonId];
            
            if (($settings['email_enabled'] ?? '0') === '1' && ($settings['email_on_reminder'] ?? '0') === '1') {
                if (!empty($app['customer_email'])) {
                    // Fetch services
                    $servicesStmt = DatabaseManager::query(
                        "SELECT s.name, s.duration_minutes FROM appointment_services ap 
                         JOIN services s ON ap.service_id = s.id 
                         WHERE ap.appointment_id = :appointment_id",
                        ['appointment_id' => $app['id']]
                    );
                    $services = $servicesStmt->fetchAll();
                    $serviceNames = array_column($services, 'name');
                    $servicesStr = implode(', ', $serviceNames);

                    $totalDuration = 0;
                    foreach ($services as $service) {
                        $totalDuration += (int)($service['duration_minutes'] ?? 30);
                    }
                    if ($totalDuration <= 0) {
                        $totalDuration = 30;
                    }

                    $timeStr = date("g:i A", strtotime($app['start_time']));
                    
                    $subject = $settings['email_reminder_subject'] ?? '';
                    if (empty($subject)) {
                        $subject = 'Upcoming Appointment Reminder';
                    }

                    $template = $settings['email_reminder_template'] ?? '';
                    if (empty($template)) {
                        $template = "Hello {customer_name},\n\nThis is a friendly reminder that you have an upcoming appointment at {salon_name} in 1 hour.\n\nDetails:\nDate: {appointment_date}\nTime: {appointment_time}\nService: {service_name}\n\nWe look forward to seeing you!\nBest regards,\n{salon_name}";
                    }

                    $placeholders = [
                        'customer_name' => $app['customer_name'],
                        'salon_name' => $app['salon_name'],
                        'appointment_date' => $app['appointment_date'],
                        'appointment_time' => $timeStr,
                        'service_name' => $servicesStr
                    ];

                    $subject = $emailService->formatTemplate($subject, $placeholders);
                    $body = $emailService->formatTemplate($template, $placeholders);

                    $calendarEvent = [
                        'title' => "Reminder: " . ($servicesStr ? $servicesStr : 'Salon Services') . " at " . $app['salon_name'],
                        'date' => $app['appointment_date'],
                        'time' => $app['start_time'],
                        'duration' => $totalDuration,
                        'description' => "Reminder for your appointment at " . $app['salon_name'] . " scheduled on " . $app['appointment_date'] . " at " . $timeStr . "."
                    ];

                    $result = $emailService->sendEmailForSalon($salonId, $app['customer_email'], $subject, $body, $calendarEvent);
                    
                    if ($result['success']) {
                        echo "Sent reminder email to {$app['customer_email']} for appointment ID {$app['id']}\n";
                    } else {
                        echo "Failed to send reminder email to {$app['customer_email']}: {$result['message']}\n";
                    }
                }
            }

            DatabaseManager::query(
                "UPDATE appointments SET reminder_sent = 1 WHERE id = :id",
                ['id' => $app['id']]
            );
        }
    }
}
