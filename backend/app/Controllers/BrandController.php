<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\BrandService;

class BrandController extends BaseController
{
    private BrandService $service;

    public function __construct()
    {
        $this->service = new BrandService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(100, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'name_en');
        $sortDir = (string)($request->input('sort_dir') ?? 'ASC');

        $filters = [];
        if ($request->input('is_active') !== null) {
            $filters['is_active'] = (int)(bool)$request->input('is_active');
        }

        $result = $this->service->list($filters, $search, $sortBy, $sortDir, $page, $perPage);

        $this->success([
            'items' => $result['items'],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $result['total'],
                'total_pages' => (int)ceil($result['total'] / $perPage),
            ],
        ]);
    }

    public function show(Request $request): void
    {
        $this->success($this->service->find((int)$request->getParam('id')));
    }

    public function store(Request $request): void
    {
        $brand = $this->service->create($request->all());
        $this->success($brand, 'Brand created successfully', 201);
    }

    public function update(Request $request): void
    {
        $brand = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($brand, 'Brand updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Brand deleted successfully');
    }
}
