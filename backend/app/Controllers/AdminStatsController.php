<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;

class AdminStatsController extends BaseController
{
    public function index(Request $request): void
    {
        try {
            // 1. Total Salons
            $totalSalons = (int) DatabaseManager::query(
                "SELECT COUNT(*) as count FROM salons"
            )->fetch()['count'];

            // 2. Active Subscriptions (salons with 'active' or 'trial' status)
            $activeSubscriptions = (int) DatabaseManager::query(
                "SELECT COUNT(*) as count FROM salons WHERE subscription_status IN ('active', 'trial') AND is_active = 1"
            )->fetch()['count'];

            // 3. Pending Trial Requests
            $pendingRequests = (int) DatabaseManager::query(
                "SELECT COUNT(*) as count FROM trial_requests WHERE status = 'pending'"
            )->fetch()['count'];

            // 4. Total Platform Revenue (sum of all completed appointment amounts)
            $totalRevenue = (float) (DatabaseManager::query(
                "SELECT COALESCE(SUM(total_amount), 0) as total FROM appointments WHERE status = 'completed'"
            )->fetch()['total'] ?? 0);

            // 5. Pending Contact Messages
            $pendingMessages = (int) DatabaseManager::query(
                "SELECT COUNT(*) as count FROM contact_messages WHERE status = 'pending'"
            )->fetch()['count'];

            // 6. Total Users across platform
            $totalUsers = (int) DatabaseManager::query(
                "SELECT COUNT(*) as count FROM users WHERE role != 'super_admin'"
            )->fetch()['count'];

            // 7. Recent Trial Requests (latest 5)
            $recentTrials = DatabaseManager::query(
                "SELECT tr.id, tr.salon_name, tr.owner_name, tr.email, tr.status, tr.created_at,
                        sp.display_name as plan_name
                 FROM trial_requests tr
                 LEFT JOIN subscription_plans sp ON tr.plan_id = sp.id
                 ORDER BY tr.created_at DESC LIMIT 5"
            )->fetchAll();

            // 8. Recent Contact Messages (latest 5)
            $recentMessages = DatabaseManager::query(
                "SELECT id, name, email, subject, status, created_at 
                 FROM contact_messages 
                 ORDER BY created_at DESC LIMIT 5"
            )->fetchAll();

            // Format revenue
            $formattedRevenue = $totalRevenue >= 1000000
                ? 'LKR ' . number_format($totalRevenue / 1000000, 1) . 'M'
                : ($totalRevenue >= 1000
                    ? 'LKR ' . number_format($totalRevenue / 1000, 0) . 'k'
                    : 'LKR ' . number_format($totalRevenue, 0));

            $this->success([
                'total_salons' => $totalSalons,
                'active_subscriptions' => $activeSubscriptions,
                'pending_requests' => $pendingRequests,
                'total_revenue' => $totalRevenue,
                'formatted_revenue' => $formattedRevenue,
                'pending_messages' => $pendingMessages,
                'total_users' => $totalUsers,
                'recent_trials' => $recentTrials,
                'recent_messages' => $recentMessages,
            ]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
