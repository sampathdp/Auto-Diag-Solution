<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\InventoryService;

class InventoryController extends BaseController
{
    private InventoryService $inventoryService;

    public function __construct()
    {
        $this->inventoryService = new InventoryService();
    }

    public function index(Request $request): void
    {
        $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
            ? \App\Core\Auth\TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $this->success($this->inventoryService->listProducts($branchId));
    }

    public function store(Request $request): void
    {
        $data = $request->all();
        $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
            ? \App\Core\Auth\TenantContext::getBranchId() 
            : (!empty($data['branch_id']) ? (int)$data['branch_id'] : null);

        if ($branchId !== null) {
            $data['branch_id'] = $branchId;
        }

        $id = $this->inventoryService->createProduct($data);
        $this->success(['id' => $id], 'Product added successfully', 201);
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->inventoryService->updateProduct($id, $request->all());
        $this->success(null, 'Product updated successfully');
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->inventoryService->deleteProduct($id);
        $this->success(null, 'Product deleted successfully');
    }

    public function recordTransaction(Request $request): void
    {
        try {
            $data = $request->all();
            $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
                ? \App\Core\Auth\TenantContext::getBranchId() 
                : (!empty($data['branch_id']) ? (int)$data['branch_id'] : null);

            if ($branchId !== null) {
                $data['branch_id'] = $branchId;
            }

            $this->inventoryService->recordTransaction($data);
            $this->success(null, 'Inventory updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function logs(Request $request): void
    {
        $productId = $request->input('product_id') ? (int)$request->input('product_id') : null;
        $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
            ? \App\Core\Auth\TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $this->success($this->inventoryService->getLogs($productId, $branchId));
    }
}
