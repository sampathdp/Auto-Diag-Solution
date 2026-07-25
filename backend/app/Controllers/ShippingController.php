<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\ShippingService;

class ShippingController extends BaseController
{
    private ShippingService $service;

    public function __construct()
    {
        $this->service = new ShippingService();
    }

    // Public storefront listing — active districts with their rate, no auth. Feeds the
    // district picker on the account address form and guest checkout.
    public function publicDistricts(Request $request): void
    {
        $this->success(['items' => $this->service->publicDistricts()]);
    }

    // --- Districts (admin) ---

    public function indexDistricts(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'name');
        $sortDir = (string)($request->input('sort_dir') ?? 'ASC');

        $filters = [];
        if ($request->input('is_active') !== null) {
            $filters['is_active'] = (int)(bool)$request->input('is_active');
        }

        $result = $this->service->listDistricts($filters, $search, $sortBy, $sortDir, $page, $perPage);

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

    public function showDistrict(Request $request): void
    {
        $this->success($this->service->findDistrict((int)$request->getParam('id')));
    }

    public function storeDistrict(Request $request): void
    {
        $district = $this->service->createDistrict($request->all());
        $this->success($district, 'Shipping district created successfully', 201);
    }

    public function updateDistrict(Request $request): void
    {
        $district = $this->service->updateDistrict((int)$request->getParam('id'), $request->all());
        $this->success($district, 'Shipping district updated successfully');
    }

    public function destroyDistrict(Request $request): void
    {
        $this->service->deleteDistrict((int)$request->getParam('id'));
        $this->success(null, 'Shipping district deleted successfully');
    }

    // --- Rates (admin) ---

    public function indexRates(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'district_name');
        $sortDir = (string)($request->input('sort_dir') ?? 'ASC');

        $result = $this->service->listRates($search, $sortBy, $sortDir, $page, $perPage);

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

    public function showRate(Request $request): void
    {
        $this->success($this->service->findRate((int)$request->getParam('id')));
    }

    public function storeRate(Request $request): void
    {
        $rate = $this->service->createRate($request->all());
        $this->success($rate, 'Shipping rate created successfully', 201);
    }

    public function updateRate(Request $request): void
    {
        $rate = $this->service->updateRate((int)$request->getParam('id'), $request->all());
        $this->success($rate, 'Shipping rate updated successfully');
    }

    public function destroyRate(Request $request): void
    {
        $this->service->deleteRate((int)$request->getParam('id'));
        $this->success(null, 'Shipping rate deleted successfully');
    }
}
