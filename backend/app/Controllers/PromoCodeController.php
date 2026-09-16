<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\PromoCodeService;

class PromoCodeController extends BaseController
{
    private PromoCodeService $service;

    public function __construct()
    {
        $this->service = new PromoCodeService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'created_at');
        $sortDir = (string)($request->input('sort_dir') ?? 'DESC');

        $filters = [];
        if ($request->input('status') !== null) {
            $filters['status'] = (string)$request->input('status');
        }
        if ($request->input('sales_rep_id') !== null) {
            $filters['sales_rep_id'] = (int)$request->input('sales_rep_id');
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

    public function report(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(200, max(1, (int)($request->input('per_page') ?? 20)));
        $this->success($this->service->report((int)$request->getParam('id'), $page, $perPage));
    }

    public function store(Request $request): void
    {
        $promo = $this->service->create($request->all());
        $this->success($promo, 'Promo code created successfully', 201);
    }

    public function update(Request $request): void
    {
        $promo = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($promo, 'Promo code updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Promo code deleted successfully');
    }

    /**
     * Public checkout-time preview — never trusted for the actual order. CheckoutService
     * independently re-runs the exact same validateForCheckout() call at order placement,
     * so a manipulated cart_total here only produces a wrong *preview*, never a wrong charge.
     */
    public function validatePublic(Request $request): void
    {
        $code = (string)($request->input('code') ?? '');
        $cartTotal = (float)($request->input('cart_total') ?? 0);
        if ($cartTotal < 0) {
            throw new DomainException('Invalid cart total', 422);
        }

        $result = $this->service->validateForCheckout($code, $cartTotal);
        $finalTotal = round($cartTotal - $result['discount_amount'], 2);

        $this->success([
            'valid' => true,
            'promo_code' => $result['promo']['code'],
            'sales_rep' => [
                'id' => (int)$result['sales_rep']['id'],
                'name' => $result['sales_rep']['name'],
            ],
            'discount' => [
                'type' => $result['promo']['discount_type'],
                'value' => (float)$result['promo']['discount_value'],
                'amount' => $result['discount_amount'],
            ],
            'subtotal' => $cartTotal,
            'final_total' => $finalTotal,
        ]);
    }
}
