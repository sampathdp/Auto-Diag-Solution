<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Core\Auth\TenantContext;

class ExpenseController extends BaseController
{
    public function index(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $branchId = TenantContext::getBranchId() !== null 
            ? TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $sql = "SELECT e.*, ec.name as category_name 
                FROM expenses e 
                LEFT JOIN expense_categories ec ON e.category_id = ec.id 
                WHERE e.salon_id = :salon_id";
        
        $params = ['salon_id' => $salonId];

        if ($branchId !== null) {
            $sql .= " AND e.branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }

        $sql .= " ORDER BY e.expense_date DESC";
        $expenses = DatabaseManager::query($sql, $params)->fetchAll();
        $this->success($expenses);
    }

    public function store(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $data = $request->all();
        $branchId = TenantContext::getBranchId() !== null 
            ? TenantContext::getBranchId() 
            : (!empty($data['branch_id']) ? (int)$data['branch_id'] : null);

        $sql = "INSERT INTO expenses (salon_id, branch_id, category_id, amount, expense_date, description) 
                VALUES (:salon_id, :branch_id, :category_id, :amount, :expense_date, :description)";
        DatabaseManager::query($sql, [
            'salon_id' => $salonId,
            'branch_id' => $branchId,
            'category_id' => $data['category_id'],
            'amount' => $data['amount'],
            'expense_date' => $data['expense_date'],
            'description' => $data['description'] ?? null
        ]);

        $this->success(null, "Expense recorded successfully.");
    }

    public function getCategories(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $sql = "SELECT * FROM expense_categories WHERE salon_id = :salon_id OR salon_id = 0";
        $categories = DatabaseManager::query($sql, ['salon_id' => $salonId])->fetchAll();
        $this->success($categories);
    }

    public function storeCategory(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $name = $request->input('name');

        $sql = "INSERT INTO expense_categories (salon_id, name) VALUES (:salon_id, :name)";
        DatabaseManager::query($sql, [
            'salon_id' => $salonId,
            'name' => $name
        ]);

        $this->success(null, "Category added successfully.");
    }
}
