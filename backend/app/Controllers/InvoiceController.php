<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Services\EmailService;

class InvoiceController extends BaseController
{
    private EmailService $emailService;

    public function __construct()
    {
        $this->emailService = new EmailService();
    }

    // GET /admin/invoices?month=2026-06&status=&search=
    public function index(Request $request): void
    {
        $month  = $request->input('month', date('Y-m'));   // e.g. 2026-06
        $status = $request->input('status', '');
        $search = $request->input('search', '');

        [$year, $mon] = explode('-', $month . '-01');

        $sql = "SELECT i.*, s.name AS salon_name, s.email AS salon_email,
                       sp.display_name AS plan_name
                FROM salon_invoices i
                JOIN salons s ON i.salon_id = s.id
                LEFT JOIN subscription_plans sp ON i.plan_id = sp.id
                WHERE YEAR(i.period_start)  = :yr
                  AND MONTH(i.period_start) = :mo";

        $params = ['yr' => (int)$year, 'mo' => (int)$mon];

        if ($status) {
            $sql .= " AND i.status = :status";
            $params['status'] = $status;
        }

        if ($search) {
            $sql .= " AND (s.name LIKE :search OR s.email LIKE :search2 OR i.invoice_number LIKE :search3)";
            $params['search']  = "%{$search}%";
            $params['search2'] = "%{$search}%";
            $params['search3'] = "%{$search}%";
        }

        $sql .= " ORDER BY i.created_at DESC";

        $invoices = DatabaseManager::query($sql, $params)->fetchAll();

        // Summary stats
        $total    = count($invoices);
        $sent     = count(array_filter($invoices, fn($i) => $i['status'] === 'sent'));
        $paid     = count(array_filter($invoices, fn($i) => $i['status'] === 'paid'));
        $overdue  = count(array_filter($invoices, fn($i) => $i['status'] === 'overdue'));
        $revenue  = array_sum(array_column(array_filter($invoices, fn($i) => $i['status'] === 'paid'), 'amount'));

        $this->success([
            'invoices' => $invoices,
            'stats'    => compact('total', 'sent', 'paid', 'overdue', 'revenue'),
            'month'    => $month,
        ]);
    }

    // POST /admin/invoices/generate   body: { month: '2026-06' }
    public function generate(Request $request): void
    {
        $month = $request->input('month', date('Y-m'));
        [$year, $mon] = explode('-', $month . '-01');
        $monthStart = "{$year}-{$mon}-01";
        $monthEnd   = date('Y-m-t', strtotime($monthStart));

        // Load all active/trial salons with their actual subscription dates
        $salons = DatabaseManager::query(
            "SELECT s.id, s.name, s.email,
                    sub.plan_id, sub.status AS sub_status,
                    sub.starts_at, sub.expires_at,
                    sp.monthly_price, sp.display_name AS plan_name
             FROM salons s
             JOIN subscriptions sub ON sub.salon_id = s.id
                  AND sub.status IN ('active','trial')
             LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
             WHERE s.is_active = 1"
        )->fetchAll();

        $created = 0;
        $skipped = 0;

        foreach ($salons as $salon) {
            // Use the subscription's actual dates; fall back to calendar month if not set
            $periodStart = $salon['starts_at']
                ? date('Y-m-d', strtotime($salon['starts_at']))
                : $monthStart;
            $periodEnd = $salon['expires_at']
                ? date('Y-m-d', strtotime($salon['expires_at']))
                : $monthEnd;

            $exists = DatabaseManager::query(
                "SELECT id FROM salon_invoices
                 WHERE salon_id = :sid
                   AND YEAR(period_start)  = :yr
                   AND MONTH(period_start) = :mo
                 LIMIT 1",
                ['sid' => $salon['id'], 'yr' => (int)$year, 'mo' => (int)$mon]
            )->fetch();

            if ($exists) {
                $skipped++;
                continue;
            }

            $invoiceNumber = 'INV-' . $year . $mon . '-' . str_pad((string)$salon['id'], 4, '0', STR_PAD_LEFT);
            $amount = (float)($salon['monthly_price'] ?? 0);

            DatabaseManager::query(
                "INSERT INTO salon_invoices
                    (salon_id, plan_id, invoice_number, period_start, period_end, amount, billing_cycle, status)
                 VALUES (:salon_id, :plan_id, :invoice_number, :period_start, :period_end, :amount, 'monthly', 'sent')",
                [
                    'salon_id'       => $salon['id'],
                    'plan_id'        => $salon['plan_id'],
                    'invoice_number' => $invoiceNumber,
                    'period_start'   => $periodStart,
                    'period_end'     => $periodEnd,
                    'amount'         => $amount,
                ]
            );
            $created++;
        }

        $this->success(
            ['created' => $created, 'skipped' => $skipped],
            "{$created} invoice(s) created, {$skipped} already existed."
        );
    }

    // POST /admin/invoices/{id}/send
    public function send(Request $request): void
    {
        $id = (int)$request->getParam('id');

        $invoice = DatabaseManager::query(
            "SELECT i.*, s.name AS salon_name, s.email AS salon_email,
                    sp.display_name AS plan_name
             FROM salon_invoices i
             JOIN salons s ON i.salon_id = s.id
             LEFT JOIN subscription_plans sp ON i.plan_id = sp.id
             WHERE i.id = :id LIMIT 1",
            ['id' => $id]
        )->fetch();

        if (!$invoice) {
            $this->error('Invoice not found.', 404);
            return;
        }

        $result = $this->dispatchInvoiceEmail($invoice);

        if ($result['success']) {
            DatabaseManager::query(
                "UPDATE salon_invoices SET sent_at = NOW(), status = 'sent' WHERE id = :id",
                ['id' => $id]
            );
            $this->success(null, 'Invoice sent successfully.');
        } else {
            $this->error('Failed to send invoice: ' . ($result['message'] ?? 'Unknown error'));
        }
    }

    // POST /admin/invoices/send-all   body: { month: '2026-06' }
    public function sendAll(Request $request): void
    {
        $month = $request->input('month', date('Y-m'));
        [$year, $mon] = explode('-', $month . '-01');

        $invoices = DatabaseManager::query(
            "SELECT i.*, s.name AS salon_name, s.email AS salon_email,
                    sp.display_name AS plan_name
             FROM salon_invoices i
             JOIN salons s ON i.salon_id = s.id
             LEFT JOIN subscription_plans sp ON i.plan_id = sp.id
             WHERE YEAR(i.period_start)  = :yr
               AND MONTH(i.period_start) = :mo
               AND i.status = 'sent' AND i.sent_at IS NULL",
            ['yr' => (int)$year, 'mo' => (int)$mon]
        )->fetchAll();

        $sent   = 0;
        $failed = 0;

        foreach ($invoices as $invoice) {
            $result = $this->dispatchInvoiceEmail($invoice);
            if ($result['success']) {
                DatabaseManager::query(
                    "UPDATE salon_invoices SET sent_at = NOW() WHERE id = :id",
                    ['id' => $invoice['id']]
                );
                $sent++;
            } else {
                $failed++;
            }
        }

        $this->success(
            ['sent' => $sent, 'failed' => $failed],
            "{$sent} invoice(s) sent, {$failed} failed."
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function dispatchInvoiceEmail(array $invoice): array
    {
        if (empty($invoice['salon_email'])) {
            return ['success' => false, 'message' => 'Salon has no email address.'];
        }

        $bankDetails = $this->getBankDetails();

        $periodLabel = date('d M Y', strtotime($invoice['period_start']))
                     . ' – ' . date('d M Y', strtotime($invoice['period_end']));
        $amount      = number_format((float)$invoice['amount'], 2);
        $planName    = $invoice['plan_name'] ?? 'Subscription';
        $salonName   = $invoice['salon_name'];
        $invoiceNo   = $invoice['invoice_number'];

        $dashUrl = rtrim($_ENV['APP_FRONTEND_URL'] ?? 'https://app.salonsystem.lk', '/');

        $html = "
<div style='font-family:sans-serif;color:#1e293b;max-width:560px'>
  <table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden'>
    <tr>
      <td style='background:#0f172a;padding:24px 32px'>
        <p style='margin:0;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase'>Invoice</p>
        <h2 style='margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:900'>{$invoiceNo}</h2>
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
            <td style='padding:16px 0;font-size:15px;font-weight:900;border-top:2px solid #e2e8f0'>Amount Due</td>
            <td style='padding:16px 0;font-size:18px;font-weight:900;text-align:right;color:#0f172a;border-top:2px solid #e2e8f0'>LKR {$amount}</td>
          </tr>
        </table>

        <div style='background:#f8fafc;border-radius:10px;padding:16px 20px;margin-top:20px'>
          <p style='margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b'>Payment Details</p>
          <p style='margin:0;font-size:13px;line-height:1.7;color:#334155'>{$bankDetails}</p>
        </div>

        <p style='margin:20px 0 0;font-size:13px;color:#64748b'>
          Please include your invoice number <strong>{$invoiceNo}</strong> as the payment reference.<br>
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

        $subject = "Invoice {$invoiceNo} — {$periodLabel} Subscription";

        return $this->emailService->sendSystemEmail($invoice['salon_email'], $subject, $html);
    }

    private function getBankDetails(): string
    {
        $rows = DatabaseManager::query(
            "SELECT setting_key, setting_value FROM system_settings
             WHERE setting_key IN ('bank_name','bank_account_name','bank_account_no','bank_branch')"
        )->fetchAll();

        $map = array_column($rows, 'setting_value', 'setting_key');

        $lines = [];
        if (!empty($map['bank_name']))         $lines[] = 'Bank: '    . $map['bank_name'];
        if (!empty($map['bank_account_name'])) $lines[] = 'Account: ' . $map['bank_account_name'];
        if (!empty($map['bank_account_no']))   $lines[] = 'Number: '  . $map['bank_account_no'];
        if (!empty($map['bank_branch']))       $lines[] = 'Branch: '  . $map['bank_branch'];

        return $lines ? implode('<br>', $lines) : 'Contact admin for payment details.';
    }
}
