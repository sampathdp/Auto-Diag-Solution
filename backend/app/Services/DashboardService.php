<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;

/**
 * Cross-table reporting aggregates for the admin dashboard — deliberately not backed
 * by a Repository, since this doesn't own any single table's row lifecycle.
 */
class DashboardService
{
    public function stats(): array
    {
        $scalar = fn(string $sql, array $params = []) => DatabaseManager::query($sql, $params)->fetchColumn();

        return [
            'total_customers' => (int) $scalar("SELECT COUNT(*) FROM users WHERE role = 'customer'"),
            'total_admins' => (int) $scalar("SELECT COUNT(*) FROM users WHERE role = 'admin'"),
            'total_products' => (int) $scalar("SELECT COUNT(*) FROM products"),
            'total_categories' => (int) $scalar("SELECT COUNT(*) FROM categories"),
            'total_orders' => (int) $scalar("SELECT COUNT(*) FROM orders"),
            'pending_orders' => (int) $scalar("SELECT COUNT(*) FROM orders WHERE status = 'pending'"),
            'total_revenue' => (float) $scalar("SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'paid'"),
            'total_reviews' => (int) $scalar("SELECT COUNT(*) FROM reviews"),
            'pending_reviews' => (int) $scalar("SELECT COUNT(*) FROM reviews WHERE is_approved = 0"),
            'low_stock_count' => (int) $scalar(
                "SELECT COUNT(*) FROM products
                 WHERE track_inventory = 1 AND low_stock_threshold IS NOT NULL AND stock_quantity <= low_stock_threshold"
            ),
            'out_of_stock_count' => (int) $scalar("SELECT COUNT(*) FROM products WHERE stock_status = 'out_of_stock'"),
        ];
    }
}
