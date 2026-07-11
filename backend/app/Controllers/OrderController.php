<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\OrderService;

class OrderController extends BaseController
{
    private OrderService $service;

    public function __construct()
    {
        $this->service = new OrderService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'created_at');
        $sortDir = (string)($request->input('sort_dir') ?? 'DESC');

        $filters = [];
        foreach (['status', 'payment_status'] as $key) {
            if ($request->input($key) !== null) {
                $filters[$key] = (string)$request->input($key);
            }
        }
        if ($request->input('user_id') !== null) {
            $filters['user_id'] = (int)$request->input('user_id');
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

    public function updateStatus(Request $request): void
    {
        $order = $this->service->updateStatus(
            (int)$request->getParam('id'),
            (string)$request->input('status'),
            $request->input('note'),
            $request->input('cancellation_reason'),
            (int)$request->user->id
        );
        $this->success($order, 'Order status updated successfully');
    }

    public function updatePaymentStatus(Request $request): void
    {
        $order = $this->service->updatePaymentStatus(
            (int)$request->getParam('id'),
            (string)$request->input('payment_status'),
            (int)$request->user->id
        );
        $this->success($order, 'Order payment status updated successfully');
    }

    public function addNote(Request $request): void
    {
        $order = $this->service->addNote(
            (int)$request->getParam('id'),
            (string)($request->input('note') ?? ''),
            (int)$request->user->id
        );
        $this->success($order, 'Note added successfully', 201);
    }
}
