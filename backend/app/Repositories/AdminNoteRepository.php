<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

/**
 * Generic internal-note store shared by orders and (later) customers —
 * one polymorphic table instead of an order_notes/customer_notes pair.
 */
class AdminNoteRepository
{
    public function forEntity(string $entityType, int $entityId): array
    {
        return DatabaseManager::query(
            "SELECT n.id, n.note AS text, u.name AS author, n.created_at
             FROM admin_notes n
             LEFT JOIN users u ON u.id = n.admin_id
             WHERE n.entity_type = :entity_type AND n.entity_id = :entity_id
             ORDER BY n.created_at DESC",
            ['entity_type' => $entityType, 'entity_id' => $entityId]
        )->fetchAll();
    }

    public function create(string $entityType, int $entityId, int $adminId, string $note): int
    {
        DatabaseManager::query(
            "INSERT INTO admin_notes (entity_type, entity_id, admin_id, note) VALUES (:entity_type, :entity_id, :admin_id, :note)",
            ['entity_type' => $entityType, 'entity_id' => $entityId, 'admin_id' => $adminId, 'note' => $note]
        );
        return (int) DatabaseManager::getLastInsertId();
    }
}
