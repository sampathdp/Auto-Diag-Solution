<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\CustomerService;

class CustomerController extends BaseController
{
    private CustomerService $service;

    public function __construct()
    {
        $this->service = new CustomerService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));

        $filters = [];
        if ($request->input('status') !== null) {
            $filters['status'] = (string)$request->input('status');
        }
        if ($request->input('has_orders') !== null) {
            $filters['has_orders'] = filter_var($request->input('has_orders'), FILTER_VALIDATE_BOOLEAN);
        }

        $result = $this->service->list($filters, $search, $page, $perPage);

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

    public function update(Request $request): void
    {
        $customer = $this->service->updateStatus(
            (int)$request->getParam('id'),
            (string)$request->input('status')
        );
        $this->success($customer, 'Customer updated successfully');
    }

    public function addresses(Request $request): void
    {
        $this->success($this->service->addresses((int)$request->getParam('id')));
    }

    public function addNote(Request $request): void
    {
        $customer = $this->service->addNote(
            (int)$request->getParam('id'),
            (string)($request->input('text') ?? ''),
            (int)$request->user->id
        );
        $this->success($customer, 'Note added successfully', 201);
    }
}
