<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\ProductService;

class ProductController extends BaseController
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(100, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'created_at');
        $sortDir = (string)($request->input('sort_dir') ?? 'DESC');

        $filters = [];
        foreach (['category_id', 'brand_id'] as $key) {
            if ($request->input($key) !== null) {
                $filters[$key] = (int)$request->input($key);
            }
        }
        foreach (['status', 'stock_status'] as $key) {
            if ($request->input($key) !== null) {
                $filters[$key] = (string)$request->input($key);
            }
        }
        if ($request->input('low_stock') !== null) {
            $filters['low_stock'] = true;
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
        $product = $this->service->create($request->all());
        $this->success($product, 'Product created successfully', 201);
    }

    public function update(Request $request): void
    {
        $product = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($product, 'Product updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Product deleted successfully');
    }

    public function updateSpecifications(Request $request): void
    {
        $product = $this->service->updateSpecifications(
            (int)$request->getParam('id'),
            $request->input('specifications')
        );
        $this->success($product, 'Specifications updated successfully');
    }

    public function updateFitment(Request $request): void
    {
        $product = $this->service->updateFitment(
            (int)$request->getParam('id'),
            $request->input('vehicle_ids')
        );
        $this->success($product, 'Vehicle fitment updated successfully');
    }
}
