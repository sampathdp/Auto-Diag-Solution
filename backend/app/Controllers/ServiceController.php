<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\ServiceService;

class ServiceController extends BaseController
{
    private ServiceService $serviceService;

    public function __construct()
    {
        $this->serviceService = new ServiceService();
    }

    public function index(Request $request): void
    {
        $filters = $request->all();
        $page = (int)($request->input('page') ?? 1);
        $perPage = (int)($request->input('per_page') ?? 100); // Usually services aren't thousands

        $result = $this->serviceService->getAllServices($filters, $page, $perPage);
        $this->success($result);
    }

    public function categories(Request $request): void
    {
        $categories = $this->serviceService->getAllCategories();
        $this->success($categories);
    }

    public function store(Request $request): void
    {
        try {
            $id = $this->serviceService->createService($request->all());
            $this->success(['id' => $id], 'Service created successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->serviceService->updateService($id, $request->all());
            $this->success(null, 'Service updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->serviceService->deleteService($id);
        $this->success(null, 'Service deleted successfully');
    }
}
