<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

/** dealer_quotations plus its items, versions and messages. */
class QuotationRepository extends BaseRepository
{
    /** Statuses in which the quotation is still being worked on (no final outcome yet). */
    public const OPEN_STATUSES = ['submitted', 'under_review', 'discussion_required', 'revised', 'approved'];

    public function __construct()
    {
        parent::__construct('dealer_quotations');
    }

    /** Row lock for every state change; call inside a transaction. */
    public function lock(int $id): ?array
    {
        $row = DatabaseManager::query("SELECT * FROM dealer_quotations WHERE id = :id FOR UPDATE", ['id' => $id])->fetch();
        return $row ?: null;
    }

    /** A dealer's own quotation; null for anyone else's, so ids can't be probed. */
    public function findForDealer(int $id, int $profileId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM dealer_quotations WHERE id = :id AND dealer_profile_id = :p LIMIT 1",
            ['id' => $id, 'p' => $profileId]
        )->fetch();
        return $row ?: null;
    }

    public function countOpenForDealer(int $profileId): int
    {
        return (int)DatabaseManager::query(
            "SELECT COUNT(*) FROM dealer_quotations
             WHERE dealer_profile_id = :p AND status IN ('submitted','under_review','discussion_required','revised','approved')",
            ['p' => $profileId]
        )->fetchColumn();
    }

    /** @return array{items: array, total: int} */
    public function paginateForDealer(int $profileId, string $status, int $page, int $perPage): array
    {
        $where = 'q.dealer_profile_id = :p';
        $params = ['p' => $profileId];
        if ($status === 'open') {
            $where .= " AND q.status IN ('submitted','under_review','discussion_required','revised','approved')";
        } elseif ($status !== '' && $status !== 'all') {
            $where .= ' AND q.status = :st';
            $params['st'] = $status;
        }
        $total = (int)DatabaseManager::query("SELECT COUNT(*) FROM dealer_quotations q WHERE {$where}", $params)->fetchColumn();
        $offset = max(0, ($page - 1) * $perPage);
        $items = DatabaseManager::query(
            "SELECT q.id, q.quotation_number, q.status, q.current_version, q.total, q.currency, q.expires_at,
                    q.submitted_at, q.updated_at, q.converted_order_id, o.order_number AS converted_order_number,
                    (SELECT COUNT(*) FROM dealer_quotation_items i WHERE i.quotation_id = q.id) AS item_count
             FROM dealer_quotations q
             LEFT JOIN orders o ON o.id = q.converted_order_id
             WHERE {$where}
             ORDER BY q.created_at DESC, q.id DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        )->fetchAll();
        return ['items' => $items, 'total' => $total];
    }

    /**
     * Admin list.
     *
     * @return array{items: array, total: int}
     */
    public function adminPaginate(string $status, string $search, ?int $profileId, int $page, int $perPage): array
    {
        $where = [];
        $params = [];
        if ($status === 'open') {
            $where[] = "q.status IN ('submitted','under_review','discussion_required','revised','approved')";
        } elseif ($status === 'needs_action') {
            $where[] = "q.status IN ('submitted','under_review')";
        } elseif ($status !== '' && $status !== 'all') {
            $where[] = 'q.status = :st';
            $params['st'] = $status;
        }
        if ($profileId !== null) {
            $where[] = 'q.dealer_profile_id = :p';
            $params['p'] = $profileId;
        }
        if ($search !== '') {
            $where[] = '(q.quotation_number LIKE :q1 OR d.business_name LIKE :q2 OR d.dealer_code LIKE :q3 OR u.email LIKE :q4)';
            $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $search) . '%';
            foreach (['q1', 'q2', 'q3', 'q4'] as $k) {
                $params[$k] = $like;
            }
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $from = "FROM dealer_quotations q
                 JOIN dealer_profiles d ON d.id = q.dealer_profile_id
                 JOIN users u ON u.id = q.user_id";

        $total = (int)DatabaseManager::query("SELECT COUNT(*) {$from} {$whereSql}", $params)->fetchColumn();
        $offset = max(0, ($page - 1) * $perPage);
        $items = DatabaseManager::query(
            "SELECT q.id, q.quotation_number, q.status, q.current_version, q.total, q.currency, q.expires_at,
                    q.is_first_order, q.payment_method_pref, q.submitted_at, q.updated_at, q.converted_order_id,
                    d.id AS dealer_profile_id, d.business_name, d.dealer_code, u.email AS user_email,
                    (SELECT COUNT(*) FROM dealer_quotation_items i WHERE i.quotation_id = q.id) AS item_count
             {$from} {$whereSql}
             ORDER BY q.updated_at DESC, q.id DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        )->fetchAll();
        return ['items' => $items, 'total' => $total];
    }

    /** @return array<string,int> */
    public function statusCounts(?int $profileId = null): array
    {
        $rows = DatabaseManager::query(
            "SELECT status, COUNT(*) AS c FROM dealer_quotations" . ($profileId !== null ? " WHERE dealer_profile_id = :p" : "") . " GROUP BY status",
            $profileId !== null ? ['p' => $profileId] : []
        )->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[$r['status']] = (int)$r['c'];
        }
        return $out;
    }

    public function items(int $quotationId): array
    {
        return DatabaseManager::query(
            "SELECT * FROM dealer_quotation_items WHERE quotation_id = :q ORDER BY sort_order, id",
            ['q' => $quotationId]
        )->fetchAll();
    }

    /** Replaces the current lines (the previous version is already kept as a snapshot). */
    public function replaceItems(int $quotationId, array $lines): void
    {
        DatabaseManager::query("DELETE FROM dealer_quotation_items WHERE quotation_id = :q", ['q' => $quotationId]);
        foreach (array_values($lines) as $i => $line) {
            DatabaseManager::query(
                "INSERT INTO dealer_quotation_items
                    (quotation_id, product_id, sku, name_en, name_ar, quantity, unit_price, retail_unit_price, line_total, vat_inclusive, free_shipping, sort_order)
                 VALUES (:q, :product_id, :sku, :name_en, :name_ar, :quantity, :unit_price, :retail_unit_price, :line_total, :vat_inclusive, :free_shipping, :sort_order)",
                [
                    'q' => $quotationId,
                    'product_id' => $line['product_id'],
                    'sku' => $line['sku'],
                    'name_en' => $line['name_en'],
                    'name_ar' => $line['name_ar'] ?? null,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'retail_unit_price' => $line['retail_unit_price'],
                    'line_total' => $line['line_total'],
                    'vat_inclusive' => $line['vat_inclusive'] ? 1 : 0,
                    'free_shipping' => !empty($line['free_shipping']) ? 1 : 0,
                    'sort_order' => $i,
                ]
            );
        }
    }

    public function addVersion(int $quotationId, int $versionNo, array $snapshot, ?string $reason, ?int $createdBy): void
    {
        DatabaseManager::query(
            "INSERT INTO dealer_quotation_versions (quotation_id, version_no, snapshot, reason, created_by)
             VALUES (:q, :v, :s, :r, :u)",
            [
                'q' => $quotationId,
                'v' => $versionNo,
                's' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
                'r' => $reason,
                'u' => $createdBy,
            ]
        );
    }

    public function versions(int $quotationId): array
    {
        $rows = DatabaseManager::query(
            "SELECT v.id, v.version_no, v.snapshot, v.reason, v.created_at, u.name AS created_by_name
             FROM dealer_quotation_versions v
             LEFT JOIN users u ON u.id = v.created_by
             WHERE v.quotation_id = :q
             ORDER BY v.version_no DESC",
            ['q' => $quotationId]
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['snapshot'] = json_decode((string)$row['snapshot'], true);
        }
        return $rows;
    }

    public function addMessage(int $quotationId, ?int $authorId, string $role, string $visibility, string $body): int
    {
        DatabaseManager::query(
            "INSERT INTO dealer_quotation_messages (quotation_id, author_id, author_role, visibility, body)
             VALUES (:q, :a, :r, :v, :b)",
            ['q' => $quotationId, 'a' => $authorId, 'r' => $role, 'v' => $visibility, 'b' => $body]
        );
        return (int)DatabaseManager::getLastInsertId();
    }

    /** @param bool $includeInternal false for the dealer: staff-only messages are never returned */
    public function messages(int $quotationId, bool $includeInternal): array
    {
        return DatabaseManager::query(
            "SELECT m.id, m.author_role, m.visibility, m.body, m.created_at, u.name AS author_name
             FROM dealer_quotation_messages m
             LEFT JOIN users u ON u.id = m.author_id
             WHERE m.quotation_id = :q" . ($includeInternal ? '' : " AND m.visibility = 'dealer'") . "
             ORDER BY m.created_at, m.id",
            ['q' => $quotationId]
        )->fetchAll();
    }

    /**
     * Approved quotations past their expiry. Locked one at a time by the caller.
     *
     * @return int[]
     */
    public function expiredIds(int $limit): array
    {
        return array_map('intval', DatabaseManager::query(
            "SELECT id FROM dealer_quotations
             WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at <= NOW()
             ORDER BY expires_at LIMIT {$limit}"
        )->fetchAll(\PDO::FETCH_COLUMN));
    }

    /** Approved quotations expiring within $hours that haven't had a reminder yet. */
    public function expiringSoon(int $hours, int $limit): array
    {
        return DatabaseManager::query(
            "SELECT * FROM dealer_quotations
             WHERE status = 'approved' AND expiry_reminder_sent_at IS NULL
               AND expires_at > NOW() AND expires_at <= DATE_ADD(NOW(), INTERVAL {$hours} HOUR)
             ORDER BY expires_at LIMIT {$limit}"
        )->fetchAll();
    }

    public function numberTaken(string $number): bool
    {
        return (bool)DatabaseManager::query(
            "SELECT id FROM dealer_quotations WHERE quotation_number = :n LIMIT 1",
            ['n' => $number]
        )->fetch();
    }
}
