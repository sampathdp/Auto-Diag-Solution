<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Core\Auth\TenantContext;
use App\Services\EmailService;

class PaymentController extends BaseController
{
    private EmailService $emailService;

    public function __construct()
    {
        $this->emailService = new EmailService();
    }

    // ── Salon owner: upload bank slip ────────────────────────────────────────

    public function uploadSlip(Request $request): void
    {
        $files = $request->getFiles();
        if (!isset($files['slip']) || $files['slip']['error'] !== UPLOAD_ERR_OK) {
            $this->error('No valid payment slip uploaded.', null, 400);
        }

        $salonId = TenantContext::getTenantId();

        // Validate MIME type and move file via FileUploader (validates content, not client filename)
        try {
            $slipUrl = \App\Core\FileUploader::upload($files['slip'], 'payments');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), null, 400);
        }
        $amount       = $request->input('amount') !== null ? (float)$request->input('amount') : 0;
        $planId       = $request->input('plan_id')       ? (int)$request->input('plan_id')    : null;
        $billingCycle = in_array($request->input('billing_cycle'), ['monthly', 'yearly'])
                        ? $request->input('billing_cycle') : 'monthly';

        // Auto-fill plan/amount when submitted from the block modal (no plan chosen)
        if (!$planId || $amount <= 0) {
            $currentSub = DatabaseManager::query(
                "SELECT plan_id FROM subscriptions WHERE salon_id = :salon_id",
                ['salon_id' => $salonId]
            )->fetch();

            if ($currentSub && $currentSub['plan_id']) {
                $planId = $planId ?: (int)$currentSub['plan_id'];
                if ($amount <= 0) {
                    $planRow = DatabaseManager::query(
                        "SELECT monthly_price FROM subscription_plans WHERE id = :id",
                        ['id' => $planId]
                    )->fetch();
                    if ($planRow) {
                        $amount = (float)$planRow['monthly_price'];
                    }
                }
            }
        }

        DatabaseManager::query(
            "INSERT INTO salon_payments (salon_id, amount, plan_id, billing_cycle, slip_url, status)
             VALUES (:salon_id, :amount, :plan_id, :billing_cycle, :slip_url, 'pending')",
            [
                'salon_id'      => $salonId,
                'amount'        => $amount,
                'plan_id'       => $planId,
                'billing_cycle' => $billingCycle,
                'slip_url'      => $slipUrl,
            ]
        );

        $this->success(null, 'Payment slip uploaded successfully. Please wait for admin approval.');
    }

    // ── Salon owner: payment history ─────────────────────────────────────────

    public function history(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $payments = DatabaseManager::query(
            "SELECT p.id, p.amount, p.billing_cycle, sp.name as plan_name, p.slip_url,
                    p.status, p.rejection_reason, p.created_at, p.coverage_start, p.coverage_end
             FROM salon_payments p
             LEFT JOIN subscription_plans sp ON p.plan_id = sp.id
             WHERE p.salon_id = :salon_id
             ORDER BY p.created_at DESC",
            ['salon_id' => $salonId]
        )->fetchAll();

        $this->success(['history' => $payments]);
    }

    // ── Super admin: list all payments ───────────────────────────────────────

    public function index(Request $request): void
    {
        $payments = DatabaseManager::query(
            "SELECT p.id, p.amount, p.billing_cycle, p.slip_url, p.status,
                    p.rejection_reason, p.created_at, p.coverage_start, p.coverage_end,
                    s.name as salon_name, s.id as salon_id, s.email,
                    sp.name as plan_name, sub.expires_at, sub.status as sub_status
             FROM salon_payments p
             JOIN salons s ON p.salon_id = s.id
             LEFT JOIN subscriptions sub ON s.id = sub.salon_id
             LEFT JOIN subscription_plans sp ON p.plan_id = sp.id
             ORDER BY p.created_at DESC"
        )->fetchAll();

        $this->success(['payments' => $payments]);
    }

    // ── Super admin: approve payment ─────────────────────────────────────────

    public function approve(Request $request): void
    {
        $paymentId = (int)$request->param('id');
        $adminId   = (int)($request->user->id ?? 0);

        $payment = DatabaseManager::query(
            "SELECT * FROM salon_payments WHERE id = :id",
            ['id' => $paymentId]
        )->fetch();

        if (!$payment) {
            $this->error('Payment not found.', null, 404);
        }
        if ($payment['status'] === 'approved') {
            $this->error('Payment is already approved.', null, 400);
        }

        $salonId         = (int)$payment['salon_id'];
        $requestedPlanId = $payment['plan_id'] !== null ? (int)$payment['plan_id'] : null;
        $amountPaid      = (float)$payment['amount'];
        $billingCycle    = $payment['billing_cycle'] ?? 'monthly';
        $monthsToAdd     = $billingCycle === 'yearly' ? 12 : 1;

        $sub = DatabaseManager::query(
            "SELECT id, status, expires_at FROM subscriptions WHERE salon_id = :salon_id",
            ['salon_id' => $salonId]
        )->fetch();

        $oldExpiresAt = $sub['expires_at'] ?? null;
        $oldStatus    = $sub['status']     ?? null;

        if ($sub) {
            $currentExpires = $sub['expires_at'] ? strtotime($sub['expires_at']) : time();

            // Reset billing anchor only when lapsed > 30 days
            if ($currentExpires < time() && (time() - $currentExpires) > (30 * 24 * 60 * 60)) {
                $coverageStart = time();
            } else {
                $coverageStart = $currentExpires;
            }

            $coverageEnd = strtotime("+{$monthsToAdd} month", $coverageStart);
            $newExpires  = date('Y-m-d H:i:s', $coverageEnd);

            $updateQuery = "UPDATE subscriptions SET status = 'active', expires_at = :expires_at,
                            reminder_7d_sent = 0, reminder_3d_sent = 0,
                            reminder_1d_sent = 0, expiry_notified = 0";
            $params = ['expires_at' => $newExpires, 'salon_id' => $salonId];

            if ($requestedPlanId) {
                $updateQuery .= ', plan_id = :plan_id';
                $params['plan_id'] = $requestedPlanId;
            }
            $updateQuery .= ' WHERE salon_id = :salon_id';
            DatabaseManager::query($updateQuery, $params);

            // Keep salon.subscription_status in sync
            DatabaseManager::query(
                "UPDATE salons SET subscription_status = 'active' WHERE id = :id",
                ['id' => $salonId]
            );

            DatabaseManager::query(
                "UPDATE salon_payments SET status = 'approved',
                    coverage_start = :cstart, coverage_end = :cend
                 WHERE id = :id",
                [
                    'cstart' => date('Y-m-d', $coverageStart),
                    'cend'   => date('Y-m-d', $coverageEnd),
                    'id'     => $paymentId,
                ]
            );

            // Audit log
            $this->logAudit($salonId, 'approved', $oldStatus, 'active', $oldExpiresAt, $newExpires,
                $requestedPlanId, $billingCycle, $amountPaid, null, $adminId);

            // Email receipt to salon owner
            $this->sendApprovalReceipt($salonId, [
                'amount'        => $amountPaid,
                'billing_cycle' => $billingCycle,
                'months'        => $monthsToAdd,
                'plan_id'       => $requestedPlanId,
                'coverage_start'=> date('Y-m-d', $coverageStart),
                'coverage_end'  => date('Y-m-d', $coverageEnd),
            ]);
        }

        $this->success(null, 'Payment approved. Subscription extended.');
    }

    // ── Super admin: reject payment ──────────────────────────────────────────

    public function reject(Request $request): void
    {
        $paymentId = (int)$request->param('id');
        $reason    = trim($request->input('reason') ?? '');
        $adminId   = (int)($request->user->id ?? 0);

        $payment = DatabaseManager::query(
            "SELECT p.*, s.email, s.name as salon_name
             FROM salon_payments p
             JOIN salons s ON p.salon_id = s.id
             WHERE p.id = :id",
            ['id' => $paymentId]
        )->fetch();

        if (!$payment) {
            $this->error('Payment not found.', null, 404);
        }

        DatabaseManager::query(
            "UPDATE salon_payments SET status = 'rejected', rejection_reason = :reason WHERE id = :id",
            ['id' => $paymentId, 'reason' => $reason]
        );

        // Audit log
        $this->logAudit((int)$payment['salon_id'], 'rejected', null, null, null, null,
            $payment['plan_id'] !== null ? (int)$payment['plan_id'] : null,
            $payment['billing_cycle'] ?? 'monthly',
            (float)$payment['amount'], $reason, $adminId);

        // Notify salon owner by email
        $this->sendRejectionNotice($payment, $reason);

        $this->success(null, 'Payment rejected. Salon owner has been notified.');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function logAudit(
        int    $salonId,
        string $eventType,
        ?string $oldStatus,
        ?string $newStatus,
        ?string $oldExpiresAt,
        ?string $newExpiresAt,
        ?int   $planId,
        ?string $billingCycle,
        ?float $amount,
        ?string $notes,
        ?int   $createdBy
    ): void {
        try {
            DatabaseManager::query(
                "INSERT INTO subscription_audit_log
                    (salon_id, event_type, old_status, new_status, old_expires_at, new_expires_at,
                     plan_id, billing_cycle, amount, notes, created_by)
                 VALUES
                    (:salon_id, :event_type, :old_status, :new_status, :old_expires_at, :new_expires_at,
                     :plan_id, :billing_cycle, :amount, :notes, :created_by)",
                [
                    'salon_id'       => $salonId,
                    'event_type'     => $eventType,
                    'old_status'     => $oldStatus,
                    'new_status'     => $newStatus,
                    'old_expires_at' => $oldExpiresAt,
                    'new_expires_at' => $newExpiresAt,
                    'plan_id'        => $planId,
                    'billing_cycle'  => $billingCycle,
                    'amount'         => $amount,
                    'notes'          => $notes,
                    'created_by'     => $createdBy,
                ]
            );
        } catch (\Throwable $e) {
            // Audit failure must never break the main operation
        }
    }

    private function sendApprovalReceipt(int $salonId, array $details): void
    {
        try {
            $salon = DatabaseManager::query(
                "SELECT s.email, s.name, sp.display_name as plan_display_name
                 FROM salons s
                 LEFT JOIN subscriptions sub ON s.id = sub.salon_id
                 LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
                 WHERE s.id = :id",
                ['id' => $salonId]
            )->fetch();

            if (!$salon) return;

            $planName    = $salon['plan_display_name'] ?? 'N/A';
            $billingDesc = $details['billing_cycle'] === 'yearly'
                ? "Annual (12 months)"
                : "Monthly (1 month)";
            $amount      = number_format($details['amount'], 2);
            $coverStart  = $details['coverage_start'];
            $coverEnd    = $details['coverage_end'];
            $dashUrl     = rtrim($_ENV['APP_URL'] ?? 'https://salonflow.cloud', '/') . '/dashboard';

            $subject = "Payment Approved — Your SalonFlow Subscription is Active";
            $message = "Hello,\n\n" .
                "Great news! Your payment has been verified and your subscription is now active.\n\n" .
                "── Payment Receipt ──────────────────────\n" .
                "Plan:            {$planName}\n" .
                "Billing Cycle:   {$billingDesc}\n" .
                "Amount Paid:     LKR {$amount}\n" .
                "Coverage Period: {$coverStart} to {$coverEnd}\n" .
                "────────────────────────────────────────\n\n" .
                "You can manage your subscription at any time from your dashboard:\n" .
                "{$dashUrl}\n\n" .
                "Thank you for choosing SalonFlow!\n\n" .
                "Best regards,\n" .
                "The SalonFlow Team";

            $this->emailService->sendSystemEmail($salon['email'], $subject, $message);
        } catch (\Throwable $e) {
            // Email failure must not roll back the approval
        }
    }

    private function sendRejectionNotice(array $payment, string $reason): void
    {
        try {
            $salonName = $payment['salon_name'] ?? 'Salon';
            $email     = $payment['email']      ?? '';
            if (!$email) return;

            $reasonText = $reason ?: 'No specific reason provided. Please contact support.';
            $dashUrl    = rtrim($_ENV['APP_URL'] ?? 'https://salonflow.cloud', '/') . '/dashboard';

            $subject = "Action Required — Your SalonFlow Payment Was Not Approved";
            $message = "Hello {$salonName},\n\n" .
                "Unfortunately your recent payment submission could not be approved.\n\n" .
                "Reason: {$reasonText}\n\n" .
                "Please review the details and re-submit a new payment slip from your dashboard:\n" .
                "{$dashUrl}\n\n" .
                "If you believe this is an error, please reply to this email or contact our support team.\n\n" .
                "Best regards,\n" .
                "The SalonFlow Team";

            $this->emailService->sendSystemEmail($email, $subject, $message);
        } catch (\Throwable $e) {
            // Email failure must not break the rejection operation
        }
    }
}
