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
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
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

    // Public storefront listing — active products only, filterable by category/brand
    // slug, price range, stock, vehicle fitment, rating, and full-text search. Kept
    // separate from index() so the admin listing's status/internal fields stay admin-only.
    public function publicIndex(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(60, max(1, (int)($request->input('per_page') ?? 12)));
        $search = trim((string)($request->input('q') ?? ''));
        $sort = (string)($request->input('sort') ?? 'newest');

        $filters = [];
        if ($request->input('category') !== null) {
            $filters['category'] = (string)$request->input('category');
        }
        if ($request->input('brand') !== null) {
            $filters['brands'] = array_filter(explode(',', (string)$request->input('brand')));
        }
        if ($request->input('min_price') !== null) {
            $filters['min_price'] = (float)$request->input('min_price');
        }
        if ($request->input('max_price') !== null) {
            $filters['max_price'] = (float)$request->input('max_price');
        }
        if ($request->input('in_stock') !== null) {
            $filters['in_stock'] = true;
        }
        foreach (['fits_year', 'fits_make', 'fits_model'] as $key) {
            if ($request->input($key) !== null) {
                $filters[$key] = (string)$request->input($key);
            }
        }
        if ($request->input('rating') !== null) {
            $filters['rating'] = (float)$request->input('rating');
        }
        if ($request->input('ids') !== null) {
            $filters['ids'] = array_filter(explode(',', (string)$request->input('ids')));
        }

        $result = $this->service->publicList($filters, $search, $sort, $page, $perPage);

        $this->success([
            'items' => $result['items'],
            'total' => $result['total'],
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($result['total'] / $perPage),
        ]);
    }

    public function publicShow(Request $request): void
    {
        $this->success($this->service->publicFind((int)$request->getParam('id')));
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
        $fulfillorId = $this->service->delete((int)$request->getParam('id'));
        $this->success(
            ['fulfillor_product_id' => $fulfillorId],
            $fulfillorId !== null
                ? "Product deleted. It still exists in Fulfillor (product {$fulfillorId}) — remove it in the Fulfillor dashboard; their API has no delete."
                : 'Product deleted successfully'
        );
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
            $request->input('fitments')
        );
        $this->success($product, 'Vehicle fitment updated successfully');
    }
}
