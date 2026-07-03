<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Core\Auth\TenantContext;

class ReportsController extends BaseController
{
    public function sales(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $startDate = $request->input('start_date', date('Y-m-01'));
        $endDate = $request->input('end_date', date('Y-m-d'));
        $branchId = TenantContext::getBranchId() !== null 
            ? TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        // 1. Revenue by Payment Method
        $sqlMethod = "SELECT payment_method, SUM(total_amount) as total, COUNT(*) as count 
                      FROM appointments 
                      WHERE salon_id = :salon_id AND appointment_date BETWEEN :start AND :end AND status = 'completed'";
        
        $params = [
            'salon_id' => $salonId,
            'start' => $startDate,
            'end' => $endDate
        ];

        if ($branchId !== null) {
            $sqlMethod .= " AND branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }

        $sqlMethod .= " GROUP BY payment_method";
        $byMethod = DatabaseManager::query($sqlMethod, $params)->fetchAll();

        // 2. Revenue by Category
        $sqlCategory = "SELECT c.name as category, SUM(aserv.price) as total 
                        FROM appointment_services aserv
                        JOIN services s ON aserv.service_id = s.id
                        JOIN service_categories c ON s.category_id = c.id
                        JOIN appointments a ON aserv.appointment_id = a.id
                        WHERE a.salon_id = :salon_id AND a.appointment_date BETWEEN :start AND :end AND a.status = 'completed'";
        
        if ($branchId !== null) {
            $sqlCategory .= " AND a.branch_id = :branch_id";
        }

        $sqlCategory .= " GROUP BY c.id";
        $byCategory = DatabaseManager::query($sqlCategory, $params)->fetchAll();

        // 3. Daily Sales for Chart
        $sqlDaily = "SELECT appointment_date as date, SUM(total_amount) as total 
                     FROM appointments 
                     WHERE salon_id = :salon_id AND appointment_date BETWEEN :start AND :end AND status = 'completed'";
        
        if ($branchId !== null) {
            $sqlDaily .= " AND branch_id = :branch_id";
        }

        $sqlDaily .= " GROUP BY appointment_date ORDER BY appointment_date ASC";
        $dailySales = DatabaseManager::query($sqlDaily, $params)->fetchAll();

        $this->success([
            'by_method' => $byMethod,
            'by_category' => $byCategory,
            'daily_sales' => $dailySales,
            'total_revenue' => array_sum(array_column($byMethod, 'total'))
        ]);
    }

    public function profitLoss(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $startDate = $request->input('start_date', date('Y-m-01'));
        $endDate = $request->input('end_date', date('Y-m-d'));
        $branchId = TenantContext::getBranchId() !== null 
            ? TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        // 1. Total Revenue
        $revenueSql = "SELECT SUM(total_amount) as total FROM appointments 
                       WHERE salon_id = :salon_id AND appointment_date BETWEEN :start AND :end AND status = 'completed'";
        
        $params = [
            'salon_id' => $salonId,
            'start' => $startDate,
            'end' => $endDate
        ];

        if ($branchId !== null) {
            $revenueSql .= " AND branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }

        $revenue = DatabaseManager::query($revenueSql, $params)->fetch()['total'] ?? 0;

        // 2. Total Expenses
        $expenseSql = "SELECT SUM(e.amount) as total, ec.name as category_name
                       FROM expenses e
                       LEFT JOIN expense_categories ec ON e.category_id = ec.id
                       WHERE e.salon_id = :salon_id AND e.expense_date BETWEEN :start AND :end";
        
        if ($branchId !== null) {
            $expenseSql .= " AND e.branch_id = :branch_id";
        }

        $expenseSql .= " GROUP BY e.category_id";
        $expensesBreakdown = DatabaseManager::query($expenseSql, $params)->fetchAll();

        $totalExpenses = array_sum(array_column($expensesBreakdown, 'total'));

        $this->success([
            'revenue' => (float)$revenue,
            'expenses' => (float)$totalExpenses,
            'net_profit' => (float)$revenue - (float)$totalExpenses,
            'expense_breakdown' => $expensesBreakdown
        ]);
    }

    public function staffPerformance(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $startDate = $request->input('start_date', date('Y-m-01'));
        $endDate = $request->input('end_date', date('Y-m-d'));
        $branchId = TenantContext::getBranchId() !== null 
            ? TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $sql = "SELECT u.name as staff_name, COUNT(a.id) as appointment_count, SUM(a.total_amount) as total_revenue,
                       AVG(TIMESTAMPDIFF(MINUTE, a.actual_start_time, a.actual_end_time)) as avg_duration
                FROM staff s
                JOIN users u ON s.user_id = u.id
                LEFT JOIN appointments a ON s.id = a.staff_id 
                    AND a.appointment_date BETWEEN :start AND :end 
                    AND a.status = 'completed'";
        
        $params = [
            'salon_id' => $salonId,
            'start' => $startDate,
            'end' => $endDate
        ];

        if ($branchId !== null) {
            $sql .= " AND a.branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }

        $sql .= " WHERE s.salon_id = :salon_id";

        if ($branchId !== null) {
            $sql .= " AND (s.branch_id = :branch_id2 OR s.branch_id IS NULL)";
            $params['branch_id2'] = $branchId;
        }

        $sql .= " GROUP BY s.id ORDER BY total_revenue DESC";
        
        $performance = DatabaseManager::query($sql, $params)->fetchAll();
        $this->success($performance);
    }

    public function serviceAnalytics(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $startDate = $request->input('start_date', date('Y-m-01'));
        $endDate = $request->input('end_date', date('Y-m-d'));
        $branchId = TenantContext::getBranchId() !== null 
            ? TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $sql = "SELECT s.name as service_name, COUNT(aserv.id) as booking_count, SUM(aserv.price) as total_revenue,
                       AVG(TIMESTAMPDIFF(MINUTE, a.actual_start_time, a.actual_end_time)) as avg_duration
                FROM appointment_services aserv
                JOIN services s ON aserv.service_id = s.id
                JOIN appointments a ON aserv.appointment_id = a.id
                WHERE a.salon_id = :salon_id AND a.appointment_date BETWEEN :start AND :end AND a.status = 'completed'";
        
        $params = [
            'salon_id' => $salonId,
            'start' => $startDate,
            'end' => $endDate
        ];

        if ($branchId !== null) {
            $sql .= " AND a.branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }

        $sql .= " GROUP BY s.id ORDER BY booking_count DESC";
        
        $analytics = DatabaseManager::query($sql, $params)->fetchAll();
        $this->success($analytics);
    }
}
