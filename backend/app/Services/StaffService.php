<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\StaffRepository;
use App\Repositories\UserRepository;
use App\Core\Database\DatabaseManager;
use App\Core\Auth\TenantContext;

class StaffService extends BaseService
{
    private StaffRepository $staffRepo;
    private UserRepository $userRepo;

    public function __construct()
    {
        $this->staffRepo = new StaffRepository();
        $this->userRepo = new UserRepository();
    }

    public function getAllStaff(): array
    {
        $salonId = TenantContext::getTenantId();
        $staff   = $this->staffRepo->allWithUser();

        $sub = DatabaseManager::query(
            "SELECT sp.max_staff, sp.name as plan_name, sub.status as sub_status, sub.expires_at
             FROM subscriptions sub
             JOIN subscription_plans sp ON sub.plan_id = sp.id
             WHERE sub.salon_id = :salon_id AND sub.status IN ('trial', 'active')
             LIMIT 1",
            ['salon_id' => $salonId]
        )->fetch();

        // Treat 0 as unlimited (misconfigured plan); fall back to 1 if no active subscription
        $raw = $sub ? (int)$sub['max_staff'] : 0;
        $maxStaff = ($raw > 0) ? $raw : ($sub ? 9999 : 1);

        return ['staff' => $staff, 'max_staff' => $maxStaff];
    }

    private function getPlanLimit(int $salonId): int
    {
        $sub = DatabaseManager::query(
            "SELECT sp.max_staff FROM subscriptions sub
             JOIN subscription_plans sp ON sub.plan_id = sp.id
             WHERE sub.salon_id = :salon_id AND sub.status IN ('trial', 'active')
             LIMIT 1",
            ['salon_id' => $salonId]
        )->fetch();

        $raw = $sub ? (int)$sub['max_staff'] : 0;
        return ($raw > 0) ? $raw : ($sub ? 9999 : 1);
    }

    public function createStaff(array $data): int
    {
        try {
            DatabaseManager::beginTransaction();

            $salonId = TenantContext::getTenantId();

            $limit = $this->getPlanLimit($salonId);

            $activeCount = (int)DatabaseManager::query(
                "SELECT COUNT(*) as c FROM staff WHERE salon_id = :salon_id",
                ['salon_id' => $salonId]
            )->fetch()['c'];

            if ($activeCount >= $limit) {
                $display = $limit >= 9999 ? 'unlimited' : $limit;
                throw new \Exception("Your subscription plan allows a maximum of {$display} staff member(s). Upgrade to add more.");
            }

            // 1. Create User
            $userId = $this->userRepo->create([
                'salon_id' => $salonId,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => password_hash($data['password'] ?? 'staff123', PASSWORD_DEFAULT),
                'role' => 'staff'
            ]);

            // 2. Create Staff record
            $staffId = $this->staffRepo->create([
                'salon_id' => $salonId,
                'user_id' => $userId,
                'branch_id' => !empty($data['branch_id']) ? (int)$data['branch_id'] : null,
                'designation' => $data['designation'] ?? '',
                'salary' => $data['salary'] ?? 0,
                'commission_enabled' => isset($data['commission_enabled']) ? (int)(bool)$data['commission_enabled'] : 1,
                'commission_type' => $data['commission_type'] ?? 'percentage',
                'commission_value' => $data['commission_value'] ?? 0
            ]);

            DatabaseManager::commit();
            return $staffId;
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function updateStaff(int $id, array $data): bool
    {
        try {
            DatabaseManager::beginTransaction();

            // Fetch current staff to get user_id
            $staff = $this->staffRepo->find($id);
            if (!$staff) throw new \Exception("Staff not found");

            // Update User details
            $userData = [];
            if (isset($data['name'])) $userData['name'] = $data['name'];
            if (isset($data['email'])) $userData['email'] = $data['email'];
            if (isset($data['is_active'])) $userData['is_active'] = $data['is_active'];
            if (!empty($data['password'])) $userData['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            
            if (!empty($userData)) {
                $this->userRepo->update((int)$staff['user_id'], $userData);
            }

            // Update Staff details
            $staffData = [];
            if (isset($data['designation'])) $staffData['designation'] = $data['designation'];
            if (isset($data['salary'])) $staffData['salary'] = $data['salary'];
            if (isset($data['commission_enabled'])) $staffData['commission_enabled'] = (int)(bool)$data['commission_enabled'];
            if (isset($data['commission_type'])) $staffData['commission_type'] = $data['commission_type'];
            if (isset($data['commission_value'])) $staffData['commission_value'] = $data['commission_value'];
            if (array_key_exists('branch_id', $data)) {
                $staffData['branch_id'] = !empty($data['branch_id']) ? (int)$data['branch_id'] : null;
            }

            if (!empty($staffData) || array_key_exists('branch_id', $data)) {
                $this->staffRepo->update($id, $staffData);
            }

            DatabaseManager::commit();
            return true;
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function changePassword(int $staffId, string $newPassword): bool
    {
        $staff = $this->staffRepo->find($staffId);
        if (!$staff) throw new \Exception("Staff not found.");
        if (strlen($newPassword) < 6) throw new \Exception("Password must be at least 6 characters.");

        $this->userRepo->update((int)$staff['user_id'], [
            'password' => password_hash($newPassword, PASSWORD_DEFAULT),
            'needs_password_change' => 0
        ]);
        return true;
    }

    /**
     * Returns all service commissions for a staff member.
     * Each row: { service_id, service_name, commission_type, commission_value }
     * Services without a custom rate are included with null type/value so the
     * frontend can show the staff default as a fallback.
     */
    public function getServiceCommissions(int $staffId): array
    {
        $staff = $this->staffRepo->find($staffId);
        if (!$staff) throw new \Exception("Staff not found");

        $salonId = TenantContext::getTenantId();

        return DatabaseManager::query("
            SELECT s.id AS service_id, s.name AS service_name, s.price,
                   ssc.commission_type, ssc.commission_value
            FROM services s
            LEFT JOIN staff_service_commissions ssc
                   ON ssc.service_id = s.id AND ssc.staff_id = :staff_id
            WHERE s.salon_id = :salon_id
            ORDER BY s.name ASC
        ", ['staff_id' => $staffId, 'salon_id' => $salonId])->fetchAll();
    }

    /**
     * Upserts per-service commissions for a staff member.
     * $rows = [{ service_id, commission_type, commission_value }]
     * Passing an empty commission_value removes the override (DELETE).
     */
    public function setServiceCommissions(int $staffId, array $rows): void
    {
        $staff = $this->staffRepo->find($staffId);
        if (!$staff) throw new \Exception("Staff not found");

        DatabaseManager::beginTransaction();
        try {
            foreach ($rows as $row) {
                $serviceId = (int)$row['service_id'];
                $type      = $row['commission_type'] ?? 'percentage';
                $value     = $row['commission_value'] ?? null;

                if ($value === null || $value === '' || $value === false) {
                    // Remove override → fall back to staff default
                    DatabaseManager::query(
                        "DELETE FROM staff_service_commissions WHERE staff_id = :sid AND service_id = :svid",
                        ['sid' => $staffId, 'svid' => $serviceId]
                    );
                } else {
                    DatabaseManager::query("
                        INSERT INTO staff_service_commissions (staff_id, service_id, commission_type, commission_value)
                        VALUES (:sid, :svid, :type, :val)
                        ON DUPLICATE KEY UPDATE commission_type = :type2, commission_value = :val2
                    ", [
                        'sid'   => $staffId,
                        'svid'  => $serviceId,
                        'type'  => $type,
                        'val'   => (float)$value,
                        'type2' => $type,
                        'val2'  => (float)$value,
                    ]);
                }
            }
            DatabaseManager::commit();
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    /**
     * Calculate commission earned for a completed appointment.
     * Uses service-specific rate if set, otherwise falls back to staff default.
     */
    public function calculateCommission(int $staffId, int $serviceId, float $servicePrice): float
    {
        $staff = $this->staffRepo->find($staffId);
        if (!$staff) return 0;

        // Check for service-specific override
        $override = DatabaseManager::query(
            "SELECT commission_type, commission_value FROM staff_service_commissions
             WHERE staff_id = :sid AND service_id = :svid LIMIT 1",
            ['sid' => $staffId, 'svid' => $serviceId]
        )->fetch();

        // Commissions disabled for this staff member
        if (!(int)($staff['commission_enabled'] ?? 1)) return 0;

        $type  = $override ? $override['commission_type']  : $staff['commission_type'];
        $value = $override ? (float)$override['commission_value'] : (float)$staff['commission_value'];

        return $type === 'percentage'
            ? round($servicePrice * $value / 100, 2)
            : round($value, 2);
    }

    public function getStaffPermissions(int $staffId): array
    {
        $staff = $this->staffRepo->find($staffId);
        if (!$staff) throw new \Exception("Staff not found");

        $row = DatabaseManager::query(
            "SELECT staff_permissions FROM users WHERE id = :id LIMIT 1",
            ['id' => (int)$staff['user_id']]
        )->fetch();

        if ($row && $row['staff_permissions']) {
            $decoded = json_decode($row['staff_permissions'], true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    public function setStaffPermissions(int $staffId, array $permissions): void
    {
        $staff = $this->staffRepo->find($staffId);
        if (!$staff) throw new \Exception("Staff not found");

        DatabaseManager::query(
            "UPDATE users SET staff_permissions = :perms WHERE id = :id",
            ['perms' => json_encode(array_values($permissions)), 'id' => (int)$staff['user_id']]
        );
    }

    public function deleteStaff(int $id): bool
    {
        try {
            DatabaseManager::beginTransaction();
            
            $staff = $this->staffRepo->find($id);
            if (!$staff) throw new \Exception("Staff not found");

            // Delete staff record
            $this->staffRepo->delete($id);

            // Optionally delete the user account too
            $this->userRepo->delete((int)$staff['user_id']);

            DatabaseManager::commit();
            return true;
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }
}
