<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\CommissionService;

class CommissionController extends BaseController
{
    private CommissionService $service;

    public function __construct()
    {
        $this->service = new CommissionService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $sortBy = (string)($request->input('sort_by') ?? 'created_at');
        $sortDir = (string)($request->input('sort_dir') ?? 'DESC');

        $filters = [];
        foreach (['sales_rep_id', 'promo_code_id'] as $key) {
            if ($request->input($key) !== null) {
                $filters[$key] = (int)$request->input($key);
            }
        }
        if ($request->input('status') !== null) {
            $filters['status'] = (string)$request->input('status');
        }
        if ($request->input('date_from') !== null) {
            $filters['date_from'] = (string)$request->input('date_from');
        }
        if ($request->input('date_to') !== null) {
            $filters['date_to'] = (string)$request->input('date_to');
        }

        $result = $this->service->list($filters, $sortBy, $sortDir, $page, $perPage);

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

    public function dashboard(Request $request): void
    {
        $this->success($this->service->dashboard());
    }

    public function approve(Request $request): void
    {
        $commission = $this->service->approve((int)$request->getParam('id'));
        $this->success($commission, 'Commission approved successfully');
    }

    public function pay(Request $request): void
    {
        $commission = $this->service->pay(
            (int)$request->getParam('id'),
            (string)($request->input('payment_method') ?? 'bank_transfer'),
            $request->input('payment_reference'),
            $request->input('payment_date'),
            $request->input('notes')
        );
        $this->success($commission, 'Commission marked as paid');
    }
}
