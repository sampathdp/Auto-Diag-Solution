<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\CustomerRepository;
use Exception;

class CustomerService extends BaseService
{
    private CustomerRepository $customerRepo;

    public function __construct()
    {
        $this->customerRepo = new CustomerRepository();
    }

    public function getAllCustomers(array $filters, int $page, int $perPage, ?int $branchId = null): array
    {
        return $this->customerRepo->allForBranch($branchId, $page, $perPage);
    }

    public function getCustomerById(int $id): ?array
    {
        return $this->customerRepo->find($id);
    }

    public function createCustomer(array $data): int
    {
        // Set default loyalty points if not provided
        $data['loyalty_points'] = $data['loyalty_points'] ?? 0;
        return $this->customerRepo->create($data);
    }

    public function updateCustomer(int $id, array $data): bool
    {
        return $this->customerRepo->update($id, $data);
    }

    public function deleteCustomer(int $id): bool
    {
        return $this->customerRepo->delete($id);
    }
}
