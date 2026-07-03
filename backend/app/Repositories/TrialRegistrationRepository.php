<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class TrialRegistrationRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('trial_requests');
    }

    public function findByEmail(string $email): ?array
    {
        $sql = "SELECT * FROM trial_requests WHERE email = :email LIMIT 1";
        $stmt = DatabaseManager::query($sql, ['email' => $email]);
        return $stmt->fetch() ?: null;
    }

    public function createRequest(array $data): int
    {
        return $this->create($data);
    }

    public function getAllRequests(string $status = null): array
    {
        $sql = "SELECT tr.*, sp.display_name as plan_display_name 
                FROM trial_requests tr 
                LEFT JOIN subscription_plans sp ON tr.plan_id = sp.id
                WHERE tr.email_verified = 1";
        
        $params = [];
        if ($status) {
            $sql .= " AND tr.status = :status";
            $params['status'] = $status;
        }
        
        $sql .= " ORDER BY tr.created_at DESC";
        return DatabaseManager::query($sql, $params)->fetchAll();
    }
}
