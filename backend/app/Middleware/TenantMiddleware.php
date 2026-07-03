<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Core\Auth\TenantContext;

class TenantMiddleware
{
    private static bool $migrated = false;

    private static function runMigrations(): void
    {
        if (self::$migrated) {
            return;
        }

        try {
            // 1. Create branches table
            \App\Core\Database\DatabaseManager::query("
                CREATE TABLE IF NOT EXISTS branches (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    salon_id BIGINT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    phone VARCHAR(50) NULL,
                    address TEXT NULL,
                    opening_time TIME DEFAULT '09:00:00',
                    closing_time TIME DEFAULT '18:00:00',
                    is_active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            // 2. Add branch_id to appointments
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE appointments ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 3. Add branch_id to staff
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE staff ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 4. Add branch_id to invoices
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE invoices ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 5. Add branch_id to expenses
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE expenses ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 6. Add branch_id to users
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE users ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 7. Add grace_period_days to salons
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE salons ADD COLUMN grace_period_days INT DEFAULT 3 AFTER is_active;");
            } catch (\Exception $e) {}

            // 8. Add plan_id to salon_payments
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE salon_payments ADD COLUMN plan_id INT NULL AFTER amount;");
            } catch (\Exception $e) {}

            // 8b. Add coverage_start and coverage_end to salon_payments
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE salon_payments ADD COLUMN coverage_start DATE NULL AFTER plan_id;");
                \App\Core\Database\DatabaseManager::query("ALTER TABLE salon_payments ADD COLUMN coverage_end DATE NULL AFTER coverage_start;");
            } catch (\Exception $e) {}

            // 7. Add branch_id to customers
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE customers ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 8. Add branch_id to products
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE products ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 9. Add branch_id to inventory_transactions
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE inventory_transactions ADD COLUMN branch_id BIGINT NULL AFTER salon_id;");
            } catch (\Exception $e) {}

            // 10. Add grace_period_days to salons
            try {
                \App\Core\Database\DatabaseManager::query("ALTER TABLE salons ADD COLUMN grace_period_days INT DEFAULT 3 AFTER theme;");
            } catch (\Exception $e) {}

            // 11. Create salon_payments table
            \App\Core\Database\DatabaseManager::query("
                CREATE TABLE IF NOT EXISTS salon_payments (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    salon_id BIGINT NOT NULL,
                    amount DECIMAL(10,2) NULL,
                    slip_url VARCHAR(255) NOT NULL,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    rejection_reason TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            self::$migrated = true;
        } catch (\Exception $e) {
            // Log or ignore
        }
    }

    public function handle(Request $request): void
    {
        self::runMigrations();

        if (!isset($request->user)) {
            Response::error('Unauthorized: Tenant context requires authentication', null, 401);
        }

        $user = $request->user;
        TenantContext::setUserId((int)$user->id);

        // Set super admin status if applicable
        if ($user->role === 'super_admin') {
            TenantContext::setSuperAdmin(true);
            // Super admins can optionally target a specific salon via header for impersonation
            $targetSalon = $request->getHeader('X-Target-Salon-Id');
            if ($targetSalon) {
                $targetSalonId = (int)$targetSalon;
                $exists = \App\Core\Database\DatabaseManager::query(
                    "SELECT id FROM salons WHERE id = :id LIMIT 1",
                    ['id' => $targetSalonId]
                )->fetch();
                if (!$exists) {
                    Response::error('Target salon not found.', null, 404);
                }
                TenantContext::setTenantId($targetSalonId);
            }
            return;
        }

        // Standard User: Enforce their assigned salon_id
        if (!isset($user->salon_id)) {
            Response::error('Forbidden: User is not assigned to a salon', null, 403);
        }

        $salonId = (int)$user->salon_id;
        TenantContext::setTenantId($salonId);
        TenantContext::setBranchId(isset($user->branch_id) && $user->branch_id !== null ? (int)$user->branch_id : null);

        // --- Payment & Grace Period Blocking Logic ---
        // Exclude authentication and payment upload routes from the block
        $path = $request->getUri();
        if (
            str_starts_with($path, '/api/v1/auth/') ||
            $path === '/api/v1/payments/upload' ||
            str_starts_with($path, '/api/auth/') ||
            $path === '/api/payments/upload'
        ) {
            return;
        }

        // Fetch subscription and grace period for the salon
        $sql = "SELECT s.grace_period_days, sub.status, sub.expires_at 
                FROM salons s 
                LEFT JOIN subscriptions sub ON s.id = sub.salon_id 
                WHERE s.id = :salon_id 
                ORDER BY sub.created_at DESC LIMIT 1";
        $salonData = \App\Core\Database\DatabaseManager::query($sql, ['salon_id' => $salonId])->fetch();

        if ($salonData) {
            $status = $salonData['status'];
            $expiresAt = $salonData['expires_at'];
            $gracePeriod = (int)($salonData['grace_period_days'] ?? 3);

            if ($status !== 'active' && $expiresAt) {
                $expiryTime = strtotime($expiresAt);
                $gracePeriodSeconds = $gracePeriod * 24 * 60 * 60;
                $blockedTime = $expiryTime + $gracePeriodSeconds;
                
                if (time() > $blockedTime) {
                    // Check if there is a pending payment slip
                    $pendingSql = "SELECT id FROM salon_payments WHERE salon_id = :salon_id AND status = 'pending' LIMIT 1";
                    $hasPending = \App\Core\Database\DatabaseManager::query($pendingSql, ['salon_id' => $salonId])->fetch();

                    if ($hasPending) {
                        Response::error('PAYMENT_PENDING: Your payment slip is under review.', null, 403);
                    } else {
                        // Trigger the special PaymentBlockModal in the frontend
                        Response::error('SUBSCRIPTION_EXPIRED: Your payment is overdue. Please upload a payment slip to restore access.', null, 403);
                    }
                }
            }
        }
    }
}
