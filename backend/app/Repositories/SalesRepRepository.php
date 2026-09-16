<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class SalesRepRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name', 'email', 'status', 'created_at'];

    public function __construct()
    {
        parent::__construct('sales_representatives');
    }

    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'name';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT * FROM sales_representatives
                {$whereSql}
                ORDER BY {$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        return (int) DatabaseManager::query("SELECT COUNT(*) AS c FROM sales_representatives {$whereSql}", $params)->fetch()['c'];
    }

    public function promoCodeCount(int $id): int
    {
        return (int) DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM promo_codes WHERE sales_rep_id = :id",
            ['id' => $id]
        )->fetch()['c'];
    }

    public function orderCount(int $id): int
    {
        return (int) DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM orders WHERE sales_rep_id = :id",
            ['id' => $id]
        )->fetch()['c'];
    }

    /** All figures needed by the admin's sales-rep detail/report view, in one pass. */
    public function stats(int $id): array
    {
        $orders = DatabaseManager::query(
            "SELECT
                COUNT(*) AS total_orders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS completed_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
                COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN total ELSE 0 END), 0) AS total_sales,
                COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN discount_amount ELSE 0 END), 0) AS total_discount_given
             FROM orders WHERE sales_rep_id = :id",
            ['id' => $id]
        )->fetch();

        $commissions = DatabaseManager::query(
            "SELECT
                COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending_commission,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0) AS approved_commission,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid_commission
             FROM commissions WHERE sales_rep_id = :id",
            ['id' => $id]
        )->fetch();

        return [
            'total_orders' => (int)$orders['total_orders'],
            'completed_orders' => (int)$orders['completed_orders'],
            'cancelled_orders' => (int)$orders['cancelled_orders'],
            'total_sales' => (float)$orders['total_sales'],
            'total_discount_given' => (float)$orders['total_discount_given'],
            'pending_commission' => (float)$commissions['pending_commission'],
            'approved_commission' => (float)$commissions['approved_commission'],
            'paid_commission' => (float)$commissions['paid_commission'],
            'outstanding_commission' => (float)$commissions['pending_commission'] + (float)$commissions['approved_commission'],
        ];
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        if (array_key_exists('status', $filters)) {
            $conditions[] = 'status = :status';
            $params['status'] = $filters['status'];
        }

        if ($search !== '') {
            $conditions[] = '(name LIKE :search1 OR email LIKE :search2 OR phone LIKE :search3)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
            $params['search3'] = $like;
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
