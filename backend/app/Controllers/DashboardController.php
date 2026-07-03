<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Core\Auth\TenantContext;

class DashboardController extends BaseController
{
    public function index(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $branchId = TenantContext::getBranchId() !== null 
            ? TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);
        $today = date('Y-m-d');

        // 1. Today's Appointments
        $aptSql = "SELECT COUNT(*) as count FROM appointments WHERE salon_id = :salon_id AND appointment_date = :today";
        $aptParams = ['salon_id' => $salonId, 'today' => $today];
        if ($branchId !== null) {
            $aptSql .= " AND branch_id = :branch_id";
            $aptParams['branch_id'] = $branchId;
        }
        $appointmentsToday = DatabaseManager::query($aptSql, $aptParams)->fetch()['count'];

        // 2. Active Customers
        $custSql = "SELECT COUNT(*) as count FROM customers WHERE salon_id = :salon_id";
        $custParams = ['salon_id' => $salonId];
        if ($branchId !== null) {
            $custSql .= " AND branch_id = :branch_id";
            $custParams['branch_id'] = $branchId;
        }
        $activeCustomers = DatabaseManager::query($custSql, $custParams)->fetch()['count'];

        // 3. Total Services
        $totalServices = DatabaseManager::query(
            "SELECT COUNT(*) as count FROM services WHERE salon_id = :salon_id AND is_active = 1",
            ['salon_id' => $salonId]
        )->fetch()['count'];

        // 4. Monthly Revenue (LKR)
        $revSql = "SELECT SUM(total_amount) as total FROM appointments 
             WHERE salon_id = :salon_id 
             AND status = 'completed' 
             AND MONTH(appointment_date) = MONTH(CURRENT_DATE())
             AND YEAR(appointment_date) = YEAR(CURRENT_DATE())";
        $revParams = ['salon_id' => $salonId];
        if ($branchId !== null) {
            $revSql .= " AND branch_id = :branch_id";
            $revParams['branch_id'] = $branchId;
        }
        $monthlyRevenue = DatabaseManager::query($revSql, $revParams)->fetch()['total'] ?? 0;

        // 5. Recent Appointments (Grouped to avoid duplicates when an appointment has multiple services)
        $recentSql = "SELECT a.id, c.name as customer, GROUP_CONCAT(s.name SEPARATOR ', ') as service_name, a.start_time as time, a.status 
             FROM appointments a
             JOIN customers c ON a.customer_id = c.id
             LEFT JOIN appointment_services aserv ON a.id = aserv.appointment_id
             LEFT JOIN services s ON aserv.service_id = s.id
             WHERE a.salon_id = :salon_id";
        $recentParams = ['salon_id' => $salonId];
        if ($branchId !== null) {
            $recentSql .= " AND a.branch_id = :branch_id";
            $recentParams['branch_id'] = $branchId;
        }
        $recentSql .= " GROUP BY a.id ORDER BY a.created_at DESC LIMIT 5";
        
        $recentAppointments = DatabaseManager::query($recentSql, $recentParams)->fetchAll();

        // 6. Monthly Revenue History (last 6 months)
        $revenueHistorySql = "SELECT 
                DATE_FORMAT(appointment_date, '%Y-%m') as month_key,
                DATE_FORMAT(appointment_date, '%b') as month_label,
                SUM(total_amount) as revenue,
                COUNT(*) as bookings
            FROM appointments
            WHERE salon_id = :salon_id
              AND status = 'completed'
              AND appointment_date >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 5 MONTH), '%Y-%m-01')";
        $revenueHistoryParams = ['salon_id' => $salonId];
        if ($branchId !== null) {
            $revenueHistorySql .= " AND branch_id = :branch_id";
            $revenueHistoryParams['branch_id'] = $branchId;
        }
        $revenueHistorySql .= " GROUP BY month_key, month_label ORDER BY month_key ASC";
        $revenueHistory = DatabaseManager::query($revenueHistorySql, $revenueHistoryParams)->fetchAll();

        // 7. Growth Rate (compare this month vs last month revenue)
        $thisMonthRev = DatabaseManager::query(
            "SELECT SUM(total_amount) as total FROM appointments 
             WHERE salon_id = :salon_id AND status = 'completed'
             AND MONTH(appointment_date) = MONTH(CURRENT_DATE())
             AND YEAR(appointment_date) = YEAR(CURRENT_DATE())"
             . ($branchId !== null ? " AND branch_id = :branch_id" : ""),
            $branchId !== null ? ['salon_id' => $salonId, 'branch_id' => $branchId] : ['salon_id' => $salonId]
        )->fetch()['total'] ?? 0;

        $lastMonthRev = DatabaseManager::query(
            "SELECT SUM(total_amount) as total FROM appointments 
             WHERE salon_id = :salon_id AND status = 'completed'
             AND MONTH(appointment_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
             AND YEAR(appointment_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))"
             . ($branchId !== null ? " AND branch_id = :branch_id" : ""),
            $branchId !== null ? ['salon_id' => $salonId, 'branch_id' => $branchId] : ['salon_id' => $salonId]
        )->fetch()['total'] ?? 0;

        $growthRate = ($lastMonthRev > 0)
            ? round((((float)$thisMonthRev - (float)$lastMonthRev) / (float)$lastMonthRev) * 100, 1)
            : 0;

        // 8. Popular Services (top 5 by booking count)
        $popularSql = "SELECT s.name, COUNT(aserv.service_id) as booking_count
            FROM appointment_services aserv
            JOIN services s ON aserv.service_id = s.id
            JOIN appointments a ON aserv.appointment_id = a.id
            WHERE a.salon_id = :salon_id AND a.status IN ('completed', 'confirmed')";
        $popularParams = ['salon_id' => $salonId];
        if ($branchId !== null) {
            $popularSql .= " AND a.branch_id = :branch_id";
            $popularParams['branch_id'] = $branchId;
        }
        $popularSql .= " GROUP BY s.id, s.name ORDER BY booking_count DESC LIMIT 5";
        $popularServices = DatabaseManager::query($popularSql, $popularParams)->fetchAll();

        // 9. Completion rate (this month)
        $totalAptMonth = DatabaseManager::query(
            "SELECT COUNT(*) as count FROM appointments 
             WHERE salon_id = :salon_id
             AND MONTH(appointment_date) = MONTH(CURRENT_DATE())
             AND YEAR(appointment_date) = YEAR(CURRENT_DATE())"
             . ($branchId !== null ? " AND branch_id = :branch_id" : ""),
            $branchId !== null ? ['salon_id' => $salonId, 'branch_id' => $branchId] : ['salon_id' => $salonId]
        )->fetch()['count'] ?? 0;

        $completedAptMonth = DatabaseManager::query(
            "SELECT COUNT(*) as count FROM appointments 
             WHERE salon_id = :salon_id AND status = 'completed'
             AND MONTH(appointment_date) = MONTH(CURRENT_DATE())
             AND YEAR(appointment_date) = YEAR(CURRENT_DATE())"
             . ($branchId !== null ? " AND branch_id = :branch_id" : ""),
            $branchId !== null ? ['salon_id' => $salonId, 'branch_id' => $branchId] : ['salon_id' => $salonId]
        )->fetch()['count'] ?? 0;

        $completionRate = ($totalAptMonth > 0)
            ? round(($completedAptMonth / $totalAptMonth) * 100, 1)
            : 0;

        // 10. Average ticket size (this month)
        $avgTicket = ($completedAptMonth > 0) ? round((float)$monthlyRevenue / $completedAptMonth) : 0;

        // 11. Get Subscription Info
        $subSql = "SELECT sp.name as plan_name, sub.status, sub.starts_at, sub.expires_at 
                   FROM subscriptions sub
                   LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
                   WHERE sub.salon_id = :salon_id LIMIT 1";
        $sub = DatabaseManager::query($subSql, ['salon_id' => $salonId])->fetch();

        if ($sub && $sub['status'] === 'trial' && $sub['starts_at'] === null) {
            $now = date('Y-m-d H:i:s');
            $expires = date('Y-m-d H:i:s', strtotime('+14 days'));
            DatabaseManager::query(
                "UPDATE subscriptions SET starts_at = :starts, expires_at = :expires WHERE salon_id = :salon_id AND status = 'trial'",
                ['starts' => $now, 'expires' => $expires, 'salon_id' => $salonId]
            );
            $sub['starts_at'] = $now;
            $sub['expires_at'] = $expires;

            // Also update the trial_requests table
            $salon = DatabaseManager::query("SELECT email FROM salons WHERE id = :id LIMIT 1", ['id' => $salonId])->fetch();
            if ($salon) {
                DatabaseManager::query(
                    "UPDATE trial_requests SET activation_started_at = :now WHERE email = :email AND activation_started_at IS NULL",
                    ['now' => $now, 'email' => $salon['email']]
                );
            }
        }

        // Fetch grace period from salon
        $salonSql = "SELECT grace_period_days FROM salons WHERE id = :salon_id LIMIT 1";
        $salon = DatabaseManager::query($salonSql, ['salon_id' => $salonId])->fetch();
        $gracePeriodDays = $salon ? (int)($salon['grace_period_days'] ?? 3) : 3;
        
        $gracePeriodEnd = null;
        if ($sub && $sub['expires_at']) {
            $gracePeriodEnd = date('Y-m-d H:i:s', strtotime($sub['expires_at']) + ($gracePeriodDays * 24 * 60 * 60));
        }

        $this->success([
            'stats' => [
                'appointments_today' => $appointmentsToday,
                'active_customers'   => $activeCustomers,
                'total_services'     => $totalServices,
                'monthly_revenue'    => (float)$monthlyRevenue,
                'completion_rate'    => $completionRate,
                'avg_ticket'         => $avgTicket,
            ],
            'recent_appointments' => $recentAppointments,
            'revenue_history'     => $revenueHistory,
            'popular_services'    => $popularServices,
            'growth_rate'         => $growthRate,
            'subscription' => $sub ? [
                'plan_name'  => $sub['plan_name'],
                'status'     => $sub['status'],
                'expires_at' => $sub['expires_at'],
                'grace_period_end' => $gracePeriodEnd,
                'is_in_grace_period' => ($sub['status'] !== 'active' && $gracePeriodEnd && time() <= strtotime($gracePeriodEnd) && time() > strtotime($sub['expires_at']))
            ] : null,
            'debug' => [
                'salonId' => $salonId,
                'sub' => $sub,
            ]
        ]);
    }
}
