<?php

/**
 * Monthly Invoice Generator & Sender
 *
 * Runs on the 1st of every month (e.g. via crontab):
 *   0 8 1 * * php /path/to/backend/cron/monthly_invoice.php >> /path/to/backend/scratch/cron.log 2>&1
 *
 * What it does:
 *   1. Generates an invoice record for every active/trial salon (skips duplicates)
 *   2. Emails each invoice to the salon owner
 *   3. Logs all actions to backend/scratch/cron.log
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/manual_autoload.php';
require_once __DIR__ . '/../bootstrap/app.php';

use App\Core\Database\DatabaseManager;
use App\Services\EmailService;

$emailService = new EmailService();

$now         = new DateTimeImmutable();
$year        = $now->format('Y');
$mon         = $now->format('m');
$periodStart = "{$year}-{$mon}-01";
$periodEnd   = $now->format('Y-m-t');          // last day of current month
$dueDate     = date('d M Y', strtotime($periodStart . ' +14 days'));
$periodLabel = $now->format('F Y');

$logDir  = __DIR__ . '/../scratch';
if (!is_dir($logDir)) mkdir($logDir, 0777, true);
$logFile = $logDir . '/cron.log';

function invoiceLog(string $msg): void
{
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] [Invoice] ' . $msg;
    file_put_contents($logFile, $line . PHP_EOL, FILE_APPEND);
    echo $line . PHP_EOL;
}

invoiceLog("--- Monthly invoice job started for {$periodLabel} ---");

// ── 1. Load bank details ──────────────────────────────────────────────────────

$bankRows = DatabaseManager::query(
    "SELECT setting_key, setting_value FROM system_settings
     WHERE setting_key IN ('bank_name','bank_account_name','bank_account_no','bank_branch')"
)->fetchAll();

$bank = array_column($bankRows, 'setting_value', 'setting_key');

$bankHtml = implode('<br>', array_filter([
    !empty($bank['bank_name'])         ? 'Bank: '    . $bank['bank_name']         : '',
    !empty($bank['bank_account_name']) ? 'Account: ' . $bank['bank_account_name'] : '',
    !empty($bank['bank_account_no'])   ? 'Number: '  . $bank['bank_account_no']   : '',
    !empty($bank['bank_branch'])       ? 'Branch: '  . $bank['bank_branch']       : '',
]));
if (!$bankHtml) $bankHtml = 'Contact admin for payment details.';

// ── 2. Load all active / trial salons ────────────────────────────────────────

$salons = DatabaseManager::query(
    "SELECT s.id, s.name, s.email,
            sub.plan_id, sp.monthly_price, sp.display_name AS plan_name,
            sub.discount_percent, sub.discount_expires_at
     FROM salons s
     JOIN subscriptions sub ON sub.salon_id = s.id
          AND sub.status IN ('active','trial')
     LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
     WHERE s.is_active = 1"
)->fetchAll();

invoiceLog(count($salons) . ' active/trial salon(s) found.');

$dashUrl = rtrim($_ENV['APP_FRONTEND_URL'] ?? 'https://app.salonsystem.lk', '/');

$generated = 0;
$sent      = 0;
$skipped   = 0;
$failed    = 0;

foreach ($salons as $salon) {

    // ── 3. Apply promo discount, if still within its redemption window ──────────

    $basePrice = (float)($salon['monthly_price'] ?? 0);
    $amount    = $basePrice;
    $hasDiscount = !empty($salon['discount_percent'])
        && (empty($salon['discount_expires_at']) || strtotime($salon['discount_expires_at']) >= time());
    if ($hasDiscount) {
        $amount = round($basePrice * (1 - ((float)$salon['discount_percent'] / 100)), 2);
    }

    // ── 4. Upsert invoice record ──────────────────────────────────────────────

    $exists = DatabaseManager::query(
        "SELECT id FROM salon_invoices WHERE salon_id = :sid AND period_start = :ps LIMIT 1",
        ['sid' => $salon['id'], 'ps' => $periodStart]
    )->fetch();

    if ($exists) {
        invoiceLog("Salon #{$salon['id']} ({$salon['name']}): invoice already exists — skipping generation.");
        $skipped++;
        $invoiceId     = $exists['id'];
        $invoiceNumber = DatabaseManager::query(
            "SELECT invoice_number FROM salon_invoices WHERE id = :id LIMIT 1",
            ['id' => $invoiceId]
        )->fetchColumn();
    } else {
        $invoiceNumber = 'INV-' . $year . $mon . '-' . str_pad((string)$salon['id'], 4, '0', STR_PAD_LEFT);

        DatabaseManager::query(
            "INSERT INTO salon_invoices
                (salon_id, plan_id, invoice_number, period_start, period_end, amount, billing_cycle, status)
             VALUES (:salon_id, :plan_id, :number, :ps, :pe, :amount, 'monthly', 'sent')",
            [
                'salon_id' => $salon['id'],
                'plan_id'  => $salon['plan_id'],
                'number'   => $invoiceNumber,
                'ps'       => $periodStart,
                'pe'       => $periodEnd,
                'amount'   => $amount,
            ]
        );
        $invoiceId = DatabaseManager::getLastInsertId();
        $generated++;
        invoiceLog("Salon #{$salon['id']} ({$salon['name']}): invoice {$invoiceNumber} generated.");
    }

    // ── 5. Send email ─────────────────────────────────────────────────────────

    if (empty($salon['email'])) {
        invoiceLog("Salon #{$salon['id']} ({$salon['name']}): no email — skipping send.");
        $failed++;
        continue;
    }

    $amountFmt = number_format($amount, 2);
    $planName  = $salon['plan_name'] ?? 'Subscription';
    $salonName = $salon['name'];

    $html = "
<div style='font-family:sans-serif;color:#1e293b;max-width:560px'>
  <table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden'>
    <tr>
      <td style='background:#0f172a;padding:24px 32px'>
        <p style='margin:0;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase'>Invoice</p>
        <h2 style='margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:900'>{$invoiceNumber}</h2>
      </td>
    </tr>
    <tr>
      <td style='padding:28px 32px'>
        <p style='margin:0 0 4px;font-size:13px;color:#64748b'>Billed to</p>
        <p style='margin:0;font-size:16px;font-weight:700'>{$salonName}</p>

        <table width='100%' cellpadding='0' cellspacing='0' style='margin-top:24px;border-top:1px solid #f1f5f9'>
          <tr>
            <td style='padding:12px 0;font-size:13px;color:#64748b'>Plan</td>
            <td style='padding:12px 0;font-size:13px;font-weight:700;text-align:right'>{$planName}</td>
          </tr>
          <tr>
            <td style='padding:12px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9'>Period</td>
            <td style='padding:12px 0;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #f1f5f9'>{$periodLabel}</td>
          </tr>
          <tr>
            <td style='padding:12px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9'>Due Date</td>
            <td style='padding:12px 0;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #f1f5f9'>{$dueDate}</td>
          </tr>" . ($hasDiscount ? "
          <tr>
            <td style='padding:12px 0;font-size:13px;color:#16a34a;border-top:1px solid #f1f5f9'>Promo Discount ({$salon['discount_percent']}% off)</td>
            <td style='padding:12px 0;font-size:13px;font-weight:700;text-align:right;color:#16a34a;border-top:1px solid #f1f5f9'>- LKR " . number_format($basePrice - $amount, 2) . "</td>
          </tr>" : "") . "
          <tr>
            <td style='padding:16px 0;font-size:15px;font-weight:900;border-top:2px solid #e2e8f0'>Amount Due</td>
            <td style='padding:16px 0;font-size:18px;font-weight:900;text-align:right;color:#0f172a;border-top:2px solid #e2e8f0'>LKR {$amountFmt}</td>
          </tr>
        </table>

        <div style='background:#f8fafc;border-radius:10px;padding:16px 20px;margin-top:20px'>
          <p style='margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b'>Payment Details</p>
          <p style='margin:0;font-size:13px;line-height:1.7;color:#334155'>{$bankHtml}</p>
        </div>

        <p style='margin:20px 0 0;font-size:13px;color:#64748b'>
          Please include your invoice number <strong>{$invoiceNumber}</strong> as the payment reference.<br>
          Upload your payment slip via your dashboard to confirm payment.
        </p>

        <div style='margin-top:24px;text-align:center'>
          <a href='{$dashUrl}/settings?tab=subscription'
             style='display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;
                    font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px'>
            Upload Payment Slip →
          </a>
        </div>
      </td>
    </tr>
  </table>
</div>";

    $subject = "Invoice {$invoiceNumber} — {$periodLabel} Subscription";
    $result  = $emailService->sendSystemEmail($salon['email'], $subject, $html);

    if ($result['success']) {
        DatabaseManager::query(
            "UPDATE salon_invoices SET sent_at = NOW() WHERE id = :id",
            ['id' => $invoiceId]
        );
        invoiceLog("Salon #{$salon['id']} ({$salon['name']}): email sent to {$salon['email']}.");
        $sent++;
    } else {
        invoiceLog("Salon #{$salon['id']} ({$salon['name']}): email FAILED — " . ($result['message'] ?? 'unknown'));
        $failed++;
    }
}

invoiceLog("--- Done. Generated: {$generated}, Sent: {$sent}, Skipped: {$skipped}, Failed: {$failed} ---");
