<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\ServiceService;

class ServiceCategoryController extends BaseController
{
    private ServiceService $serviceService;

    public function __construct()
    {
        $this->serviceService = new ServiceService();
    }

    public function index(Request $request): void
    {
        $categories = $this->serviceService->getAllCategories();
        $this->success($categories);
    }

    public function store(Request $request): void
    {
        try {
            $id = $this->serviceService->createCategory($request->all());
            $this->success(['id' => $id], 'Category created successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->serviceService->updateCategory($id, $request->all());
            $this->success(null, 'Category updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->serviceService->deleteCategory($id);
            $this->success(null, 'Category deleted successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
