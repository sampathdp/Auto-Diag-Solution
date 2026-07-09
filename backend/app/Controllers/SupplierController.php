<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\SupplierService;

class SupplierController extends BaseController
{
    private SupplierService $service;

    public function __construct()
    {
        $this->service = new SupplierService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(100, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'name');
        $sortDir = (string)($request->input('sort_dir') ?? 'ASC');

        $filters = [];
        if ($request->input('status') !== null) {
            $filters['status'] = (string)$request->input('status');
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
        $supplier = $this->service->create($request->all());
        $this->success($supplier, 'Supplier created successfully', 201);
    }

    public function update(Request $request): void
    {
        $supplier = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($supplier, 'Supplier updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Supplier deleted successfully');
    }
}
