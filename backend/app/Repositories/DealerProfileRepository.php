<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

/** dealer_profiles plus its child tables (history, documents, credit account). */
class DealerProfileRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('dealer_profiles');
    }

    public function findByUser(int $userId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM dealer_profiles WHERE user_id = :user_id LIMIT 1",
            ['user_id' => $userId]
        )->fetch();
        return $row ?: null;
    }

    /** Row lock for status transitions; call inside a transaction. */
    public function lock(int $id): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM dealer_profiles WHERE id = :id FOR UPDATE",
            ['id' => $id]
        )->fetch();
        return $row ?: null;
    }

    public function dealerCodeTaken(string $code, ?int $exceptId = null): bool
    {
        $row = DatabaseManager::query(
            "SELECT id FROM dealer_profiles WHERE dealer_code = :code" . ($exceptId ? " AND id <> :id" : "") . " LIMIT 1",
            $exceptId ? ['code' => $code, 'id' => $exceptId] : ['code' => $code]
        )->fetch();
        return (bool)$row;
    }

    /**
     * Admin list. $statuses empty = every status except draft (drafts are unfinished
     * applications the dealer hasn't sent yet).
     *
     * @param string[] $statuses
     * @return array{items: array, total: int}
     */
    public function adminPaginate(array $statuses, string $search, int $page, int $perPage): array
    {
        $where = [];
        $params = [];

        if ($statuses) {
            $in = [];
            foreach (array_values($statuses) as $i => $s) {
                $in[] = ":st{$i}";
                $params["st{$i}"] = $s;
            }
            $where[] = 'd.status IN (' . implode(',', $in) . ')';
        } else {
            $where[] = "d.status <> 'draft'";
        }

        if ($search !== '') {
            $where[] = '(d.business_name LIKE :q1 OR d.business_email LIKE :q2 OR d.trade_licence_number LIKE :q3
                        OR d.business_phone LIKE :q4 OR d.dealer_code LIKE :q5 OR u.email LIKE :q6)';
            $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $search) . '%';
            foreach (['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as $k) {
                $params[$k] = $like;
            }
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $total = (int)DatabaseManager::query(
            "SELECT COUNT(*) FROM dealer_profiles d JOIN users u ON u.id = d.user_id {$whereSql}",
            $params
        )->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $items = DatabaseManager::query(
            "SELECT d.id, d.status, d.dealer_code, d.business_name, d.business_type, d.trade_licence_number,
                    d.business_email, d.business_phone, d.emirate, d.city, d.submitted_at, d.reviewed_at,
                    d.activated_at, d.expires_at, d.created_at, d.updated_at,
                    u.id AS user_id, u.name AS user_name, u.email AS user_email,
                    c.credit_enabled, c.credit_limit, c.credit_period_days
             FROM dealer_profiles d
             JOIN users u ON u.id = d.user_id
             LEFT JOIN dealer_credit_accounts c ON c.dealer_profile_id = d.id
             {$whereSql}
             ORDER BY COALESCE(d.submitted_at, d.created_at) DESC, d.id DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        )->fetchAll();

        return ['items' => $items, 'total' => $total];
    }

    /** @return array<string,int> count per status (for the admin filter tabs) */
    public function statusCounts(): array
    {
        $rows = DatabaseManager::query("SELECT status, COUNT(*) AS c FROM dealer_profiles GROUP BY status")->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[$r['status']] = (int)$r['c'];
        }
        return $out;
    }

    public function addHistory(int $profileId, ?string $from, string $to, ?string $reason, ?int $changedBy): void
    {
        DatabaseManager::query(
            "INSERT INTO dealer_status_history (dealer_profile_id, from_status, to_status, reason, changed_by)
             VALUES (:p, :f, :t, :r, :u)",
            ['p' => $profileId, 'f' => $from, 't' => $to, 'r' => $reason, 'u' => $changedBy]
        );
    }

    public function history(int $profileId): array
    {
        return DatabaseManager::query(
            "SELECT h.id, h.from_status, h.to_status, h.reason, h.created_at, u.name AS changed_by_name
             FROM dealer_status_history h
             LEFT JOIN users u ON u.id = h.changed_by
             WHERE h.dealer_profile_id = :p
             ORDER BY h.created_at DESC, h.id DESC",
            ['p' => $profileId]
        )->fetchAll();
    }

    /** Active documents, metadata only (never the storage key). */
    public function activeDocuments(int $profileId): array
    {
        return DatabaseManager::query(
            "SELECT id, doc_type, original_name, mime_type, size_bytes, created_at
             FROM dealer_documents
             WHERE dealer_profile_id = :p AND status = 'active'
             ORDER BY doc_type, id DESC",
            ['p' => $profileId]
        )->fetchAll();
    }

    public function findDocument(int $documentId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM dealer_documents WHERE id = :id LIMIT 1",
            ['id' => $documentId]
        )->fetch();
        return $row ?: null;
    }

    /** Marks earlier active files of this type superseded, then records the new one. */
    public function replaceDocument(int $profileId, string $docType, array $stored, int $uploadedBy): int
    {
        DatabaseManager::query(
            "UPDATE dealer_documents SET status = 'superseded'
             WHERE dealer_profile_id = :p AND doc_type = :t AND status = 'active'",
            ['p' => $profileId, 't' => $docType]
        );
        DatabaseManager::query(
            "INSERT INTO dealer_documents (dealer_profile_id, doc_type, storage_key, original_name, mime_type, size_bytes, sha256, uploaded_by)
             VALUES (:p, :t, :k, :n, :m, :s, :h, :u)",
            [
                'p' => $profileId,
                't' => $docType,
                'k' => $stored['key'],
                'n' => $stored['original_name'],
                'm' => $stored['mime'],
                's' => $stored['size'],
                'h' => $stored['sha256'],
                'u' => $uploadedBy,
            ]
        );
        return (int)DatabaseManager::getLastInsertId();
    }

    public function creditAccount(int $profileId): ?array
    {
        $row = DatabaseManager::query(
            "SELECT * FROM dealer_credit_accounts WHERE dealer_profile_id = :p LIMIT 1",
            ['p' => $profileId]
        )->fetch();
        return $row ?: null;
    }

    public function saveCreditTerms(int $profileId, bool $enabled, string $limit, int $days, ?string $terms, int $adminId): void
    {
        DatabaseManager::query(
            "INSERT INTO dealer_credit_accounts (dealer_profile_id, credit_enabled, credit_limit, credit_period_days, payment_terms, updated_by)
             VALUES (:p, :e, :l, :d, :t, :u)
             ON DUPLICATE KEY UPDATE credit_enabled = VALUES(credit_enabled), credit_limit = VALUES(credit_limit),
                 credit_period_days = VALUES(credit_period_days), payment_terms = VALUES(payment_terms), updated_by = VALUES(updated_by)",
            ['p' => $profileId, 'e' => $enabled ? 1 : 0, 'l' => $limit, 'd' => $days, 't' => $terms, 'u' => $adminId]
        );
    }

    public function maxId(): int
    {
        return (int)DatabaseManager::query("SELECT COALESCE(MAX(id), 0) FROM dealer_profiles")->fetchColumn();
    }
}
