<?php

/**
 * Subscription Expiry & Reminder Cron Job
 *
 * Run this script nightly (e.g. via crontab):
 *   0 1 * * * php /path/to/backend/cron/subscription_check.php >> /path/to/backend/scratch/cron.log 2>&1
 *
 * What it does:
 *   1. Sends "7 days left"  reminder emails
 *   2. Sends "3 days left"  reminder emails
 *   3. Sends "1 day left"   reminder emails
 *   4. Sends "expired today" notification emails
 *   5. Auto-marks subscriptions as 'expired' once grace period has passed
 *   6. Updates salons.subscription_status to match
 *   7. Writes all actions to backend/scratch/cron.log
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/app.php';

use App\Core\Database\DatabaseManager;
use App\Services\EmailService;

$emailService = new EmailService();
$now          = time();
$log          = [];

function cronLog(string $message): void
{
    global $log;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $message;
    $log[] = $line;
    echo $line . PHP_EOL;
}

cronLog('--- Subscription check started ---');

// ── 0. Auto-renew active subscriptions that have a start date set ─────────────
//       When expires_at has passed, roll it forward by 1 month automatically.
//       The monthly invoice cron (monthly_invoice.php) sends the bill separately.

$autoRenewable = DatabaseManager::query(
    "SELECT sub.id, sub.salon_id, sub.expires_at, s.name AS salon_name
     FROM subscriptions sub
     JOIN salons s ON sub.salon_id = s.id
     WHERE sub.status = 'active'
       AND sub.starts_at IS NOT NULL
       AND sub.expires_at IS NOT NULL
       AND sub.expires_at <= NOW()"
)->fetchAll();

cronLog('Auto-renew: ' . count($autoRenewable) . ' subscription(s) to roll forward.');

foreach ($autoRenewable as $ar) {
    DatabaseManager::query(
        "UPDATE subscriptions
         SET expires_at        = DATE_ADD(expires_at, INTERVAL 1 MONTH),
             reminder_7d_sent  = 0,
             reminder_3d_sent  = 0,
             reminder_1d_sent  = 0,
             expiry_notified   = 0
         WHERE id = :id",
        ['id' => $ar['id']]
    );

    try {
        DatabaseManager::query(
            "INSERT INTO subscription_audit_log
                (salon_id, event_type, old_status, new_status, old_expires_at, new_expires_at, notes, created_by)
             VALUES (:salon_id, 'auto_renewed', 'active', 'active', :old_exp,
                     DATE_ADD(:old_exp2, INTERVAL 1 MONTH), 'Auto-renewed by cron', NULL)",
            ['salon_id' => $ar['salon_id'], 'old_exp' => $ar['expires_at'], 'old_exp2' => $ar['expires_at']]
        );
    } catch (\Throwable $e) { /* never let audit failure stop the cron */ }

    cronLog("[Auto-renewed] Salon #{$ar['salon_id']} ({$ar['salon_name']}) — rolled 1 month forward from {$ar['expires_at']}.");
}

// ── 1. Load all active/trial subscriptions with salon & owner details ────────

$subs = DatabaseManager::query(
    "SELECT sub.id, sub.salon_id, sub.status, sub.expires_at,
            sub.reminder_7d_sent, sub.reminder_3d_sent,
            sub.reminder_1d_sent, sub.expiry_notified,
            s.name as salon_name, s.email as salon_email,
            s.grace_period_days
     FROM subscriptions sub
     JOIN salons s ON sub.salon_id = s.id
     WHERE sub.status IN ('trial', 'active')
       AND sub.expires_at IS NOT NULL"
)->fetchAll();

cronLog('Found ' . count($subs) . ' active/trial subscriptions to check.');

$dashUrl = rtrim($_ENV['APP_URL'] ?? 'https://salonflow.cloud', '/') . '/dashboard';

foreach ($subs as $sub) {
    $salonId      = (int)$sub['salon_id'];
    $expiresTs    = strtotime($sub['expires_at']);
    $daysLeft     = (int)ceil(($expiresTs - $now) / 86400);
    $graceDays    = max(0, (int)($sub['grace_period_days'] ?? 3));
    $email        = $sub['salon_email'];
    $salonName    = $sub['salon_name'];

    // ── Reminder: 7 days before expiry ─────────────────────────────────────
    if ($daysLeft <= 7 && $daysLeft > 3 && !$sub['reminder_7d_sent']) {
        $subject = "Your SalonFlow Subscription Expires in {$daysLeft} Days";
        $body    = "Hello {$salonName},\n\n" .
            "This is a friendly reminder that your SalonFlow subscription expires on " .
            date('F j, Y', $expiresTs) . " ({$daysLeft} days from now).\n\n" .
            "To avoid interruption, please make your payment and upload the slip before the expiry date:\n" .
            "{$dashUrl}/settings?tab=subscription\n\n" .
            "If you have already made a payment, please allow 24 hours for verification.\n\n" .
            "Best regards,\nThe SalonFlow Team";

        $result = $emailService->sendSystemEmail($email, $subject, $body);
        DatabaseManager::query(
            "UPDATE subscriptions SET reminder_7d_sent = 1 WHERE id = :id",
            ['id' => $sub['id']]
        );
        logAudit($salonId, 'reminder_7d', null, null, null, null, "7-day expiry reminder sent");
        cronLog("[Reminder-7d] Salon #{$salonId} ({$salonName}) — {$daysLeft} days left. Email sent: " . ($result['success'] ? 'yes' : 'no'));
    }

    // ── Reminder: 3 days before expiry ─────────────────────────────────────
    if ($daysLeft <= 3 && $daysLeft > 1 && !$sub['reminder_3d_sent']) {
        $subject = "Urgent: SalonFlow Subscription Expires in {$daysLeft} Days";
        $body    = "Hello {$salonName},\n\n" .
            "Your SalonFlow subscription will expire in just {$daysLeft} days on " .
            date('F j, Y', $expiresTs) . ".\n\n" .
            "After expiry, you will have a {$graceDays}-day grace period before access is suspended.\n\n" .
            "Please renew now to avoid any interruption:\n" .
            "{$dashUrl}/settings?tab=subscription\n\n" .
            "Best regards,\nThe SalonFlow Team";

        $result = $emailService->sendSystemEmail($email, $subject, $body);
        DatabaseManager::query(
            "UPDATE subscriptions SET reminder_3d_sent = 1 WHERE id = :id",
            ['id' => $sub['id']]
        );
        logAudit($salonId, 'reminder_3d', null, null, null, null, "3-day expiry reminder sent");
        cronLog("[Reminder-3d] Salon #{$salonId} ({$salonName}) — {$daysLeft} days left. Email sent: " . ($result['success'] ? 'yes' : 'no'));
    }

    // ── Reminder: 1 day before expiry ──────────────────────────────────────
    if ($daysLeft <= 1 && $daysLeft > 0 && !$sub['reminder_1d_sent']) {
        $subject = "Final Notice: SalonFlow Subscription Expires Tomorrow";
        $body    = "Hello {$salonName},\n\n" .
            "This is your final reminder — your subscription expires TOMORROW on " .
            date('F j, Y', $expiresTs) . ".\n\n" .
            "After expiry you will have a {$graceDays}-day grace period. If no payment is received " .
            "within the grace period, your salon access will be suspended.\n\n" .
            "Renew immediately:\n{$dashUrl}/settings?tab=subscription\n\n" .
            "Best regards,\nThe SalonFlow Team";

        $result = $emailService->sendSystemEmail($email, $subject, $body);
        DatabaseManager::query(
            "UPDATE subscriptions SET reminder_1d_sent = 1 WHERE id = :id",
            ['id' => $sub['id']]
        );
        logAudit($salonId, 'reminder_1d', null, null, null, null, "1-day expiry reminder sent");
        cronLog("[Reminder-1d] Salon #{$salonId} ({$salonName}) — expires tomorrow. Email sent: " . ($result['success'] ? 'yes' : 'no'));
    }

    // ── Expiry notification (day of / just after expiry) ─────────────────
    if ($daysLeft <= 0 && !$sub['expiry_notified']) {
        $subject = "Your SalonFlow Subscription Has Expired";
        $body    = "Hello {$salonName},\n\n" .
            "Your SalonFlow subscription expired on " . date('F j, Y', $expiresTs) . ".\n\n" .
            "You have a {$graceDays}-day grace period during which you can still access your dashboard. " .
            "Please submit your payment immediately to avoid suspension:\n" .
            "{$dashUrl}/settings?tab=subscription\n\n" .
            "If you have already submitted your payment slip, our team will verify it within 24 hours.\n\n" .
            "Best regards,\nThe SalonFlow Team";

        $result = $emailService->sendSystemEmail($email, $subject, $body);
        DatabaseManager::query(
            "UPDATE subscriptions SET expiry_notified = 1 WHERE id = :id",
            ['id' => $sub['id']]
        );
        logAudit($salonId, 'expiry_notified', $sub['status'], $sub['status'], $sub['expires_at'], null, "Expiry notification email sent");
        cronLog("[Expired] Salon #{$salonId} ({$salonName}) — expired. Email sent: " . ($result['success'] ? 'yes' : 'no'));
    }

    // ── Auto-mark as expired after grace period ───────────────────────────
    $gracePeriodEnds = $expiresTs + ($graceDays * 86400);
    if ($now > $gracePeriodEnds && $sub['status'] !== 'expired') {
        // Check for a pending payment slip — do NOT hard-expire if payment is under review
        $pendingPayment = DatabaseManager::query(
            "SELECT id FROM salon_payments WHERE salon_id = :salon_id AND status = 'pending' LIMIT 1",
            ['salon_id' => $salonId]
        )->fetch();

        if (!$pendingPayment) {
            DatabaseManager::query(
                "UPDATE subscriptions SET status = 'expired' WHERE id = :id",
                ['id' => $sub['id']]
            );
            DatabaseManager::query(
                "UPDATE salons SET subscription_status = 'expired' WHERE id = :id",
                ['id' => $salonId]
            );
            logAudit($salonId, 'expired', $sub['status'], 'expired', $sub['expires_at'], null,
                "Auto-expired by cron after {$graceDays}-day grace period");
            cronLog("[Auto-expired] Salon #{$salonId} ({$salonName}) — grace period ended, no pending payment.");
        } else {
            cronLog("[Skip-expire] Salon #{$salonId} ({$salonName}) — grace ended but has pending payment slip.");
        }
    }
}

cronLog('--- Subscription check finished ---');

// Write a tidy log file
$logDir = __DIR__ . '/../scratch';
if (!is_dir($logDir)) {
    mkdir($logDir, 0777, true);
}
file_put_contents($logDir . '/cron.log', implode(PHP_EOL, $log) . PHP_EOL, FILE_APPEND);

// ── Helper ──────────────────────────────────────────────────────────────────

function logAudit(
    int    $salonId,
    string $eventType,
    ?string $oldStatus,
    ?string $newStatus,
    ?string $oldExpires,
    ?string $newExpires,
    ?string $notes
): void {
    try {
        DatabaseManager::query(
            "INSERT INTO subscription_audit_log
                (salon_id, event_type, old_status, new_status, old_expires_at, new_expires_at, notes, created_by)
             VALUES (:salon_id, :event_type, :old_status, :new_status, :old_expires, :new_expires, :notes, NULL)",
            [
                'salon_id'    => $salonId,
                'event_type'  => $eventType,
                'old_status'  => $oldStatus,
                'new_status'  => $newStatus,
                'old_expires' => $oldExpires,
                'new_expires' => $newExpires,
                'notes'       => $notes,
            ]
        );
    } catch (\Throwable $e) {
        // Never let audit failure stop the cron
    }
}
