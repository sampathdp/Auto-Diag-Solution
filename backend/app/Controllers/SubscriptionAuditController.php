<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;

class SubscriptionAuditController extends BaseController
{
    public function index(Request $request): void
    {
        $salonId = (int)$request->getParam('salonId');

        $rows = DatabaseManager::query(
            "SELECT sal.id, sal.event_type, sal.old_status, sal.new_status,
                    sal.old_expires_at, sal.new_expires_at,
                    sal.billing_cycle, sal.amount, sal.notes,
                    sal.created_at,
                    u.name as created_by_name
             FROM subscription_audit_log sal
             LEFT JOIN users u ON sal.created_by = u.id
             WHERE sal.salon_id = :salon_id
             ORDER BY sal.created_at DESC
             LIMIT 100",
            ['salon_id' => $salonId]
        )->fetchAll();

        $this->success(['log' => $rows]);
    }
}
