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
        // Admin order list filters by 'user_id'; the customer detail page's order tab
        // sends 'customer_id' instead — same column, accept either.
        $userId = $request->input('user_id') ?? $request->input('customer_id');
        if ($userId !== null) {
            $filters['user_id'] = (int)$userId;
        }

        $withItems = filter_var($request->input('with_items') ?? false, FILTER_VALIDATE_BOOLEAN);

        $result = $this->service->list($filters, $search, $sortBy, $sortDir, $page, $perPage, $withItems);

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
            (int)$request->user->id,
            $request->input('carrier'),
            $request->input('tracking_number')
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

    public function requestRefund(Request $request): void
    {
        $order = $this->service->requestRefund(
            (int)$request->getParam('id'),
            (int)$request->user->id
        );
        $this->success($order, 'Refund requested successfully');
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

    public function verifyVin(Request $request): void
    {
        $order = $this->service->verifyVin(
            (int)$request->getParam('id'),
            is_string($request->input('note')) ? $request->input('note') : null,
            (int)$request->user->id
        );
        $this->success($order, 'VIN approved');
    }

    public function approveFulfillment(Request $request): void
    {
        $order = $this->service->approveForFulfillment(
            (int)$request->getParam('id'),
            (int)$request->user->id
        );
        $this->success($order, 'Order approved and sent to 3PL');
    }

    public function syncFulfillment(Request $request): void
    {
        $order = $this->service->syncFulfillmentStatus((int)$request->getParam('id'));
        $this->success($order, 'Fulfillment status synced');
    }
}
