<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database\DatabaseManager;
use App\Core\Request;
use App\Services\AdminActivityLogger;
use App\Services\Mail\EmailOutbox;

/** Admin view of queued/sent/failed emails, with resend for failed ones. */
class NotificationOutboxController extends BaseController
{
    private const STATUSES = ['pending', 'sending', 'sent', 'failed', 'skipped'];

    /** GET /admin/notifications/outbox?status=&page=&per_page= */
    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(100, max(1, (int)($request->input('per_page') ?? 25)));
        $status = (string)($request->input('status') ?? '');

        $where = '';
        $params = [];
        if (in_array($status, self::STATUSES, true)) {
            $where = 'WHERE status = :status';
            $params['status'] = $status;
        }

        $total = (int)DatabaseManager::query("SELECT COUNT(*) FROM notification_outbox {$where}", $params)->fetchColumn();
        $offset = ($page - 1) * $perPage;
        $items = DatabaseManager::query(
            "SELECT id, channel, recipient, subject, template, status, attempts, last_error, available_at, sent_at, created_at
             FROM notification_outbox {$where} ORDER BY id DESC LIMIT {$perPage} OFFSET {$offset}",
            $params
        )->fetchAll();

        $counts = DatabaseManager::query("SELECT status, COUNT(*) AS c FROM notification_outbox GROUP BY status")->fetchAll();
        $summary = array_fill_keys(self::STATUSES, 0);
        foreach ($counts as $row) {
            $summary[$row['status']] = (int)$row['c'];
        }
        $oldestPending = DatabaseManager::query(
            "SELECT MIN(created_at) FROM notification_outbox WHERE status = 'pending'"
        )->fetchColumn();

        $this->success([
            'items' => $items,
            'meta' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'total_pages' => max(1, (int)ceil($total / $perPage)),
            ],
            'summary' => $summary,
            'oldest_pending_at' => $oldestPending ?: null,
        ]);
    }

    /** POST /admin/notifications/outbox/{id}/resend */
    public function resend(Request $request): void
    {
        $id = (int)$request->getParam('id');
        if (!EmailOutbox::requeue($id)) {
            $this->error('Only failed or skipped emails can be resent', null, 409);
            return;
        }
        AdminActivityLogger::log((int)$request->user->id, 'email.resend', 'notification_outbox', $id);
        $result = EmailOutbox::deliver($id);
        $this->success(['status' => $result ?? 'pending'], $result === 'sent' ? 'Email sent' : 'Email queued for retry');
    }
}
