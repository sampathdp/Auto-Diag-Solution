<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\ProductRepository;
use App\Repositories\InventoryTransactionRepository;
use App\Core\Database\DatabaseManager;
use Exception;

class InventoryService extends BaseService
{
    private ProductRepository $productRepo;
    private InventoryTransactionRepository $transactionRepo;

    public function __construct()
    {
        $this->productRepo = new ProductRepository();
        $this->transactionRepo = new InventoryTransactionRepository();
    }

    public function listProducts(int $branchId = null): array
    {
        return $this->productRepo->allForBranch($branchId);
    }

    public function createProduct(array $data): int
    {
        return $this->productRepo->create($data);
    }

    public function updateProduct(int $id, array $data): bool
    {
        return $this->productRepo->update($id, $data);
    }

    public function deleteProduct(int $id): bool
    {
        return $this->productRepo->delete($id);
    }

    public function recordTransaction(array $data): bool
    {
        DatabaseManager::beginTransaction();

        try {
            $productId = (int)$data['product_id'];
            $type = $data['type'];
            $quantity = (int)$data['quantity'];
            $salonId = \App\Core\Auth\TenantContext::getTenantId();

            // 1. Record the transaction
            $data['salon_id'] = $salonId;
            $this->transactionRepo->create($data);

            // 2. Update product stock
            $product = $this->productRepo->find($productId);
            if (!$product) {
                throw new Exception("Product not found");
            }

            $newQuantity = (int)$product['stock_quantity'];
            if (in_array($type, ['sale', 'usage'])) {
                $newQuantity -= $quantity;
            } else {
                $newQuantity += $quantity;
            }

            $this->productRepo->update($productId, ['stock_quantity' => $newQuantity]);

            DatabaseManager::commit();
            return true;

        } catch (Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function getLogs(int $productId = null, int $branchId = null): array
    {
        return $this->transactionRepo->getLogs($productId, $branchId);
    }
}
