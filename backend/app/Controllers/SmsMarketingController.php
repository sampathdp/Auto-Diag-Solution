<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Core\Auth\TenantContext;
use App\Services\SmsService;

class SmsMarketingController extends BaseController
{
    private SmsService $smsService;

    public function __construct()
    {
        $this->smsService = new SmsService();
    }

    /**
     * GET /sms/clients
     * All customers with a valid phone — used by the recipient selector.
     */
    public function clients(Request $request): void
    {
        $salonId = TenantContext::getTenantId();

        $rows = DatabaseManager::query(
            "SELECT id, name, phone
             FROM customers
             WHERE salon_id = :salon_id
               AND phone IS NOT NULL
               AND TRIM(phone) != ''
             ORDER BY name ASC",
            ['salon_id' => $salonId]
        )->fetchAll();

        $this->success(['clients' => $rows]);
    }

    /**
     * POST /sms/broadcast
     * Body: { label, message, customer_ids?: number[] }
     * If customer_ids is omitted or empty → sends to ALL clients with a phone.
     */
    public function broadcast(Request $request): void
    {
        $salonId    = TenantContext::getTenantId();
        $label      = trim($request->input('label') ?? '');
        $message    = trim($request->input('message') ?? '');
        $rawIds     = $request->input('customer_ids'); // null | array

        if (empty($message)) {
            $this->error('Message is required.', null, 400);
        }
        if (mb_strlen($message) > 640) {
            $this->error('Message too long (max 640 characters / 4 SMS credits).', null, 400);
        }
        if (empty($label)) {
            $label = 'Broadcast ' . date('d M Y H:i');
        }

        // Build customer query
        $customerIds = [];
        if (!empty($rawIds) && is_array($rawIds)) {
            $customerIds = array_map('intval', $rawIds);
        }

        if (!empty($customerIds)) {
            $placeholders = implode(',', array_fill(0, count($customerIds), '?'));
            $stmt = DatabaseManager::rawQuery(
                "SELECT id, name, phone FROM customers
                 WHERE salon_id = ? AND id IN ($placeholders)
                   AND phone IS NOT NULL AND TRIM(phone) != ''",
                array_merge([$salonId], $customerIds)
            );
            $customers = $stmt->fetchAll();
        } else {
            $customers = DatabaseManager::query(
                "SELECT id, name, phone FROM customers
                 WHERE salon_id = :salon_id
                   AND phone IS NOT NULL AND TRIM(phone) != ''",
                ['salon_id' => $salonId]
            )->fetchAll();
        }

        $total     = count($customers);
        $sent      = 0;
        $failed    = 0;
        $salonRow  = DatabaseManager::query(
            "SELECT name FROM salons WHERE id = :id",
            ['id' => $salonId]
        )->fetch();
        $salonName = $salonRow['name'] ?? 'Your Salon';

        DatabaseManager::query(
            "INSERT INTO sms_broadcasts (salon_id, label, message, total_recipients, status)
             VALUES (:salon_id, :label, :message, :total, 'sending')",
            ['salon_id' => $salonId, 'label' => $label, 'message' => $message, 'total' => $total]
        );
        $broadcastId = (int)DatabaseManager::lastInsertId();

        foreach ($customers as $customer) {
            $personalised = str_replace(
                ['{name}',  '{salon}'],
                [$customer['name'], $salonName],
                $message
            );
            $result = $this->smsService->sendSms($customer['phone'], $personalised);
            $result['success'] ? $sent++ : $failed++;
        }

        $status = $failed === 0 ? 'done' : ($sent === 0 ? 'failed' : 'partial');

        DatabaseManager::query(
            "UPDATE sms_broadcasts
             SET sent_count = :sent, failed_count = :failed, status = :status
             WHERE id = :id",
            ['sent' => $sent, 'failed' => $failed, 'status' => $status, 'id' => $broadcastId]
        );

        $this->success(
            ['sent' => $sent, 'failed' => $failed, 'total' => $total],
            "Broadcast complete. {$sent} sent, {$failed} failed."
        );
    }

    /**
     * GET /sms/broadcasts
     * Broadcast history for this salon.
     */
    public function history(Request $request): void
    {
        $salonId = TenantContext::getTenantId();

        $rows = DatabaseManager::query(
            "SELECT id, label, message, total_recipients, sent_count, failed_count, status, created_at
             FROM sms_broadcasts
             WHERE salon_id = :salon_id
             ORDER BY created_at DESC
             LIMIT 50",
            ['salon_id' => $salonId]
        )->fetchAll();

        $this->success(['broadcasts' => $rows]);
    }
}
