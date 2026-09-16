<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class PromoCodeRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'code', 'status', 'used_count', 'expiry_date', 'created_at'];

    public function __construct()
    {
        parent::__construct('promo_codes');
    }

    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'created_at';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT p.*, r.name AS sales_rep_name
                FROM promo_codes p
                LEFT JOIN sales_representatives r ON r.id = p.sales_rep_id
                {$whereSql}
                ORDER BY p.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM promo_codes p {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function findByCode(string $code): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM promo_codes WHERE code = :code LIMIT 1",
            ['code' => $code]
        )->fetch();
        return $row ?: null;
    }

    public function orderCount(int $id): int
    {
        return (int) DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM orders WHERE promo_code_id = :id",
            ['id' => $id]
        )->fetch()['c'];
    }

    /**
     * Atomically consumes one use of the code, but only if it hasn't already hit its
     * limit — closes the race where two simultaneous checkouts both read used_count as
     * "still under the limit" and both proceed. Returns false (caller must abort the
     * order) if the limit was reached between validation and this call.
     */
    public function incrementUsage(int $id): bool
    {
        $stmt = DatabaseManager::query(
            "UPDATE promo_codes
             SET used_count = used_count + 1
             WHERE id = :id AND (usage_limit IS NULL OR used_count < usage_limit)",
            ['id' => $id]
        );
        return $stmt->rowCount() > 0;
    }

    /** Report figures for the admin's per-promo-code report view. */
    public function stats(int $id): array
    {
        $row = DatabaseManager::query(
            "SELECT
                COUNT(*) AS total_usage,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS completed_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
                COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN total ELSE 0 END), 0) AS total_sales,
                COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN discount_amount ELSE 0 END), 0) AS total_discount
             FROM orders WHERE promo_code_id = :id",
            ['id' => $id]
        )->fetch();

        $commissions = DatabaseManager::query(
            "SELECT
                COALESCE(SUM(commission_amount), 0) AS total_commission,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending_commission,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid_commission
             FROM commissions WHERE promo_code_id = :id",
            ['id' => $id]
        )->fetch();

        return [
            'total_usage' => (int)$row['total_usage'],
            'completed_orders' => (int)$row['completed_orders'],
            'cancelled_orders' => (int)$row['cancelled_orders'],
            'total_sales' => (float)$row['total_sales'],
            'total_discount' => (float)$row['total_discount'],
            'total_commission' => (float)$commissions['total_commission'],
            'pending_commission' => (float)$commissions['pending_commission'],
            'paid_commission' => (float)$commissions['paid_commission'],
        ];
    }

    public function ordersForCode(int $id, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        return DatabaseManager::query(
            "SELECT o.id, o.order_number, o.created_at, o.total, o.discount_amount, o.commission_amount, o.status,
                    u.name AS customer_name
             FROM orders o LEFT JOIN users u ON u.id = o.user_id
             WHERE o.promo_code_id = :id
             ORDER BY o.created_at DESC
             LIMIT {$perPage} OFFSET {$offset}",
            ['id' => $id]
        )->fetchAll();
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        if (array_key_exists('status', $filters)) {
            $conditions[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        }
        if (array_key_exists('sales_rep_id', $filters)) {
            $conditions[] = 'p.sales_rep_id = :sales_rep_id';
            $params['sales_rep_id'] = $filters['sales_rep_id'];
        }

        if ($search !== '') {
            $conditions[] = '(p.code LIKE :search1 OR p.description LIKE :search2)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
