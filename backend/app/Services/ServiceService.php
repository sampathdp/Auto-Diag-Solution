<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\ServiceRepository;
use App\Repositories\ServiceCategoryRepository;

class ServiceService extends BaseService
{
    private ServiceRepository $serviceRepo;
    private ServiceCategoryRepository $categoryRepo;

    public function __construct()
    {
        $this->serviceRepo = new ServiceRepository();
        $this->categoryRepo = new ServiceCategoryRepository();
    }

    public function getAllServices(array $filters, int $page, int $perPage): array
    {
        return $this->serviceRepo->allWithCategory($filters, $page, $perPage);
    }

    public function getAllCategories(): array
    {
        return $this->categoryRepo->all([], 1, 9999);
    }

    public function createCategory(array $data): int
    {
        return $this->categoryRepo->create($data);
    }

    public function updateCategory(int $id, array $data): bool
    {
        return $this->categoryRepo->update($id, $data);
    }

    public function deleteCategory(int $id): bool
    {
        return $this->categoryRepo->delete($id);
    }

    public function createService(array $data): int
    {
        return $this->serviceRepo->create($data);
    }

    public function updateService(int $id, array $data): bool
    {
        return $this->serviceRepo->update($id, $data);
    }

    public function deleteService(int $id): bool
    {
        return $this->serviceRepo->delete($id);
    }
}
