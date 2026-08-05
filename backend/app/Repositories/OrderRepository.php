<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class OrderRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'order_number', 'total', 'created_at'];

    public function __construct()
    {
        parent::__construct('orders');
    }

    /** Paginated list with the customer's name/email joined in for the admin order table. */
    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'created_at';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT o.*, u.name AS customer_name, u.email AS customer_email,
                       (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
                FROM orders o
                LEFT JOIN users u ON u.id = o.user_id
                {$whereSql}
                ORDER BY o.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM orders o LEFT JOIN users u ON u.id = o.user_id {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function countByUser(int $userId): int
    {
        return (int) DatabaseManager::query(
            "SELECT COUNT(*) AS c FROM orders WHERE user_id = :user_id",
            ['user_id' => $userId]
        )->fetch()['c'];
    }

    /** Excludes cancelled orders — those were never actually fulfilled/paid for. */
    public function sumTotalByUser(int $userId): float
    {
        return (float) DatabaseManager::query(
            "SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE user_id = :user_id AND status != 'cancelled'",
            ['user_id' => $userId]
        )->fetch()['s'];
    }

    public function findForUser(int $id, int $userId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM orders WHERE id = :id AND user_id = :user_id",
            ['id' => $id, 'user_id' => $userId]
        )->fetch();
        return $row ?: null;
    }

    /** Guest-safe order lookup for the emailed tracking link — matches on the order_number
     * shown to the customer plus the hash of the token from their link, never on user_id. */
    public function findByOrderNumberAndTokenHash(string $orderNumber, string $tokenHash): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM orders WHERE order_number = :order_number AND tracking_token_hash = :token_hash",
            ['order_number' => $orderNumber, 'token_hash' => $tokenHash]
        )->fetch();
        return $row ?: null;
    }

    public function setTrackingTokenHash(int $id, string $tokenHash): void
    {
        DatabaseManager::query(
            "UPDATE orders SET tracking_token_hash = :token_hash WHERE id = :id",
            ['token_hash' => $tokenHash, 'id' => $id]
        );
    }

    public function findWithCustomer(int $id): ?array
    {
        $row = DatabaseManager::query(
            "SELECT o.*, u.name AS customer_name, u.email AS customer_email
             FROM orders o LEFT JOIN users u ON u.id = o.user_id
             WHERE o.id = :id",
            ['id' => $id]
        )->fetch();
        return $row ?: null;
    }

    public function items(int $orderId): array
    {
        return DatabaseManager::query(
            "SELECT * FROM order_items WHERE order_id = :id ORDER BY id ASC",
            ['id' => $orderId]
        )->fetchAll();
    }

    /** Bulk item lookup for a page of orders (e.g. reports), keyed by order_id — one query instead of N. */
    public function itemsForOrderIds(array $orderIds): array
    {
        if (empty($orderIds)) {
            return [];
        }

        $placeholders = [];
        $params = [];
        foreach (array_values($orderIds) as $i => $id) {
            $key = "id{$i}";
            $placeholders[] = ":{$key}";
            $params[$key] = $id;
        }

        $rows = DatabaseManager::query(
            "SELECT * FROM order_items WHERE order_id IN (" . implode(',', $placeholders) . ") ORDER BY id ASC",
            $params
        )->fetchAll();

        $byOrderId = [];
        foreach ($rows as $row) {
            $byOrderId[(int)$row['order_id']][] = $row;
        }
        return $byOrderId;
    }

    public function statusHistory(int $orderId): array
    {
        return DatabaseManager::query(
            "SELECT h.*, u.name AS changed_by_name
             FROM order_status_history h
             LEFT JOIN users u ON u.id = h.changed_by
             WHERE h.order_id = :id ORDER BY h.created_at DESC",
            ['id' => $orderId]
        )->fetchAll();
    }

    public function addStatusHistory(int $orderId, string $status, ?string $note, ?int $changedBy): void
    {
        DatabaseManager::query(
            "INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (:order_id, :status, :note, :changed_by)",
            ['order_id' => $orderId, 'status' => $status, 'note' => $note, 'changed_by' => $changedBy]
        );
    }

    /**
     * Orders already handed to Fulfillor that haven't reached a terminal status yet —
     * the polling half of keeping our status in sync with theirs (the push half is
     * the webhook receiver). Used by both the admin console.php cron command and could
     * back a scheduled job later.
     */
    public function findSyncableFulfillorOrders(): array
    {
        return DatabaseManager::query(
            "SELECT * FROM orders
             WHERE fulfillor_order_id IS NOT NULL
               AND status NOT IN ('delivered', 'cancelled', 'refunded')"
        )->fetchAll();
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        foreach (['status', 'payment_status'] as $column) {
            if (array_key_exists($column, $filters)) {
                $conditions[] = "o.{$column} = :{$column}";
                $params[$column] = $filters[$column];
            }
        }
        if (array_key_exists('user_id', $filters)) {
            $conditions[] = 'o.user_id = :user_id';
            $params['user_id'] = $filters['user_id'];
        }
        if (array_key_exists('date_from', $filters)) {
            $conditions[] = 'o.created_at >= :date_from';
            $params['date_from'] = $filters['date_from'];
        }

        if ($search !== '') {
            $conditions[] = '(o.order_number LIKE :search1 OR u.name LIKE :search2 OR u.email LIKE :search3)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
            $params['search3'] = $like;
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
