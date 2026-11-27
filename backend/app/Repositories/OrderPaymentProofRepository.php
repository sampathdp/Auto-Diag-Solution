<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class OrderPaymentProofRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('order_payment_proofs');
    }

    /** Metadata only; storage_key stays on the server. */
    public function forOrder(int $orderId): array
    {
        return DatabaseManager::query(
            "SELECT id, original_name, mime_type, size_bytes, created_at
             FROM order_payment_proofs WHERE order_id = :order_id ORDER BY created_at ASC, id ASC",
            ['order_id' => $orderId]
        )->fetchAll();
    }

    public function countForOrder(int $orderId): int
    {
        return (int)DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM order_payment_proofs WHERE order_id = :order_id",
            ['order_id' => $orderId]
        )->fetch()['c'];
    }

    public function findForOrder(int $orderId, int $proofId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM order_payment_proofs WHERE id = :id AND order_id = :order_id",
            ['id' => $proofId, 'order_id' => $orderId]
        )->fetch();
        return $row ?: null;
    }
}
