<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class CommissionPaymentRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('commission_payments');
    }

    public function forSalesRep(int $salesRepId): array
    {
        return DatabaseManager::query(
            "SELECT * FROM commission_payments WHERE sales_rep_id = :id ORDER BY payment_date DESC",
            ['id' => $salesRepId]
        )->fetchAll();
    }
}
