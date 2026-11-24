<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;

/** Writes to the existing admin_activity_logs table: the audit trail for sensitive admin actions. */
class AdminActivityLogger
{
    public static function log(?int $adminId, string $action, string $entityType, ?int $entityId, array $changes = []): void
    {
        DatabaseManager::query(
            "INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, changes, ip_address)
             VALUES (:admin_id, :action, :entity_type, :entity_id, :changes, :ip)",
            [
                'admin_id' => $adminId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'changes' => $changes ? json_encode($changes, JSON_UNESCAPED_UNICODE) : null,
                'ip' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
            ]
        );
    }
}
