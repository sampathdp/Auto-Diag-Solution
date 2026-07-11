<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\CategoryService;

class CategoryController extends BaseController
{
    private CategoryService $service;

    public function __construct()
    {
        $this->service = new CategoryService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'sort_order');
        $sortDir = (string)($request->input('sort_dir') ?? 'ASC');

        $filters = [];
        if ($request->input('parent_id') !== null) {
            $filters['parent_id'] = $request->input('parent_id') === 'null'
                ? null
                : (int)$request->input('parent_id');
        }
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
        $category = $this->service->find((int)$request->getParam('id'));
        $this->success($category);
    }

    public function store(Request $request): void
    {
        $category = $this->service->create($request->all());
        $this->success($category, 'Category created successfully', 201);
    }

    public function update(Request $request): void
    {
        $category = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($category, 'Category updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Category deleted successfully');
    }
}
