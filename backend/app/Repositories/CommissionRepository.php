<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class CommissionRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'commission_amount', 'status', 'created_at'];

    public function __construct()
    {
        parent::__construct('commissions');
    }

    public function paginate(array $filters, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'created_at';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT c.*, o.order_number, o.user_id AS customer_id, u.name AS customer_name,
                       r.name AS sales_rep_name, p.code AS promo_code
                FROM commissions c
                LEFT JOIN orders o ON o.id = c.order_id
                LEFT JOIN users u ON u.id = o.user_id
                LEFT JOIN sales_representatives r ON r.id = c.sales_rep_id
                LEFT JOIN promo_codes p ON p.id = c.promo_code_id
                {$whereSql}
                ORDER BY c.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters): int
    {
        [$whereSql, $params] = $this->buildWhere($filters);
        $sql = "SELECT COUNT(*) AS c FROM commissions c LEFT JOIN orders o ON o.id = c.order_id {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function findDetailed(int $id): ?array
    {
        $row = DatabaseManager::query(
            "SELECT c.*, o.order_number, o.user_id AS customer_id, u.name AS customer_name,
                    r.name AS sales_rep_name, p.code AS promo_code
             FROM commissions c
             LEFT JOIN orders o ON o.id = c.order_id
             LEFT JOIN users u ON u.id = o.user_id
             LEFT JOIN sales_representatives r ON r.id = c.sales_rep_id
             LEFT JOIN promo_codes p ON p.id = c.promo_code_id
             WHERE c.id = :id",
            ['id' => $id]
        )->fetch();
        return $row ?: null;
    }

    public function findByOrderId(int $orderId): ?array
    {
        return $this->findBy('order_id', $orderId);
    }

    /** Overview counters for the admin "Referral & Commission Dashboard". */
    public function dashboardTotals(): array
    {
        $row = DatabaseManager::query(
            "SELECT
                COALESCE(SUM(commission_amount), 0) AS total_commission,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending_commission,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0) AS approved_commission,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid_commission
             FROM commissions"
        )->fetch();

        return [
            'total_commission' => (float)$row['total_commission'],
            'pending_commission' => (float)$row['pending_commission'],
            'approved_commission' => (float)$row['approved_commission'],
            'paid_commission' => (float)$row['paid_commission'],
        ];
    }

    private function buildWhere(array $filters): array
    {
        $conditions = [];
        $params = [];

        foreach (['sales_rep_id', 'status', 'promo_code_id'] as $column) {
            if (array_key_exists($column, $filters)) {
                $conditions[] = "c.{$column} = :{$column}";
                $params[$column] = $filters[$column];
            }
        }
        if (array_key_exists('date_from', $filters)) {
            $conditions[] = 'c.created_at >= :date_from';
            $params['date_from'] = $filters['date_from'];
        }
        if (array_key_exists('date_to', $filters)) {
            $conditions[] = 'c.created_at <= :date_to';
            $params['date_to'] = $filters['date_to'];
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
